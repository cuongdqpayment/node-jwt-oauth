const jwt = require('jsonwebtoken');
const config = require('./config.js');
const formidable = require('formidable');
const fs = require('fs');
const systempath = require('path');
const url = require('url');
const dirUpload = 'upload_files';
if (!fs.existsSync(dirUpload)) {
    fs.mkdirSync(dirUpload);
}

const request = require('request');
//khai bao csdl
const databaseService = require('../db/sqlite/database-service');
//tao bang du lieu luu tru
databaseService.HandleDatabase.init();


//khoa RSA su dung cho MidleWare:
//su dung de import key chinh vao verify, sign, decrypted va encrytped
const NodeRSA = require('node-rsa');
const MidlewareRSA = new NodeRSA(null, { signingScheme: 'pkcs1-sha256' });

var RSAKeyObj; //bien public de su dung


var tokenSign = (req) => {
  let signTime = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  let clientIp= req.ip; //day la dia chi noi
  //tim dia chi WAN nhu sau:
    if (req.headers["client_ip"]){
      clientIp=req.headers["client_ip"];
    }else if (req.headers["x-real-ip"]){
      clientIp=req.headers["x-real-ip"];
    }else if (req.headers["x-forwarded-for"]){
      clientIp=req.headers["x-forwarded-for"];
    }else if (req.headers["remote_add"]){
      clientIp=req.headers["remote_add"];
    }
  
    console.log('Sign secret:');
    console.log(config.secret + clientIp + req.headers["user-agent"] + signTime);
  if (req.user&&req.user.USERNAME){
    //truong hop nay neu luu session? hoac luu db?
    let tokenSign = jwt.sign({
                    username: req.user.USERNAME,
                    nickname: (req.user.DISPLAY_NAME)?req.user.DISPLAY_NAME:'',
                    image: (req.user.URL_IMAGE)?req.user.URL_IMAGE:'',//, //thong tin anh cua nguoi su dung
                    req_ip: clientIp, //chi duoc cap cho ip nay
                    req_time: signTime
                  },
                    (config.secret /* + clientIp */ + req.headers["user-agent"] + signTime)
                    , {
                      expiresIn: '24h' // expires in 24 hours
                    }
                  );
      //save session or db de khi logout thi xoa di

      return tokenSign;

  }else{
    return jwt.sign({
      req_device:req.headers["user-agent"],
      req_ip: clientIp,
      req_time: signTime
    },
      (config.secret /* + clientIp */ + req.headers["user-agent"] + signTime)
      , {
        expiresIn: '24h' // expires in 24 hours
      }
    );
  }
}

var verifyToken=(req,res)=>{
  if (req.token) {
    var token = req.token;
    if (token.startsWith('Bearer ')) {
      // Remove Bearer from string
      token = token.slice(7, token.length);
    }
    var tokenObj = jwt.decode(token);
    let clientIp= req.ip; //day la dia chi noi
  //tim dia chi WAN nhu sau:
    if (req.headers["client_ip"]){
      clientIp=req.headers["client_ip"];
    }else if (req.headers["x-real-ip"]){
      clientIp=req.headers["x-real-ip"];
    }else if (req.headers["x-forwarded-for"]){
      clientIp=req.headers["x-forwarded-for"];
    }else if (req.headers["remote_add"]){
      clientIp=req.headers["remote_add"];
    }
    console.log('Verify secret:');
    console.log(config.secret + clientIp + req.headers["user-agent"] + (tokenObj?tokenObj.req_time:''));
    return jwt.verify(token
      , (config.secret /* + clientIp */ + req.headers["user-agent"] + (tokenObj?tokenObj.req_time:''))
      , (err, decoded) => {
        if (err) {
          return false;
        } else {
          req.user = decoded;
          //console.log("User Verify OK:");
          return true
        }
      });
  } else {
    return false;
  }
};


class HandlerGenerator {

  // khoi tao lay bien public 
  init() {
    //KHONG CAN TAO //chi tao khi tao database thoi
  }

  //kiem tra token bang get (header the same site)
  //kiem tra HeaderOption with token then same site
  tokenGetCheck(req, res, next){
    let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase
    //gan cho request de xu ly ve sau
    //xac thuc qua nhieu phuong phap (GET, POST, PARAM..)
    req.token=token;
    if (verifyToken(req,res)){
      next();
    }else{
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        message: 'Auth token is not supplied'
      }));
    }
  }

  //su dung lenh get url?param1=xx&param2=xxx&token=xyz
  tokenGetParamsCheck(req, res, next){
    //lay token tren param
    //console.log('Xu ly tham so' + JSON.stringify(url.parse(req.url, true, false)));
    //chuyen doi duong dan tuyet doi
    let path = decodeURIComponent(url.parse(req.url, true, false).pathname);
    let query = url.parse(req.url, true, false).query;
    // console.log('pathname: ' + path);
    // console.log('query: ' + JSON.stringify(query));
    if (path&&query&&query.token){
      //xac thuc qua nhieu phuong phap (GET, POST, PARAM..)
      req.token=query.token; //token de verify tra ve req.user
      req.pathName=path; //truy van duong dan da xu ly req.pathName
      if (verifyToken(req,res)){
        next();
      }else{
        //cho phep chi can co token khong can dung
        //lay anh xem
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          message: 'Auth token is invalid!'
        }));
      }
    }else{
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        message: 'Auth token is not supplied'
      }));
    }

  }

  //verify Post token from any client CORS (*)
  //kiem tra du lieu kieu JSON.stringify
  tokenPostCheck(req, res, next) {
    let postDataString = '';
    // Get all post data when receive data event.
    req.on('data', (chunk) => {
      postDataString += chunk;
    });
    // When all request post data has been received.
    req.on('end', () => {
      //chuyen doi Object JSON tu chuoi data nhan duoc
      let postDataObject = JSON.parse(postDataString);
      //console.log(postDataObject);

      if (postDataObject && postDataObject.Authorization) {
        let token = postDataObject.Authorization;
        //da lay duoc token qua json
        //gan cho req de xu ly token
        req.token=token;
        if (verifyToken(req,res)){
          next();
        }else{
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            message: 'Auth token is not supplied'
          }));
        }
      } else {
        //khong truyen
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({
          success: false,
          message: 'Auth token is not supplied ANY!'
        }));
      }
    });
  }

  //kiem tra du lieu kieu FormData
  tokenPostFormCheck(req, res, next) {
    const form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      let token;
      let userSave={};
      if (err) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(err));
      } else {
        for (let key in fields) {
          if (key = 'Authorization') token = fields[key];
          if (key = 'DISPLAY_NAME') userSave.DISPLAY_NAME = fields[key];
          if (key = 'FULL_NAME') userSave.FULL_NAME = fields[key];
          if (key = 'PHONE') userSave.PHONE = fields[key];
          if (key = 'EMAIL') userSave.EMAIL = fields[key];
          if (key = 'FULL_ADDRESS') userSave.FULL_ADDRESS = fields[key];
        }
      }
      //LUU FILE VAO URL
      //console.log(token);
      //CHI THUC HIEN TAI FILE KHI XAC THUC TOKEN LA DUNG
      if (token) {
        req.token=token;
        if (verifyToken(req,res)){
          //luu lay duong dan va tra next cho phien ke tiep
          console.log('Token FormData Post OK:');
          console.log(req.user);
          for (let key in files) {
            //kiem tra tinh hop le cua file roi moi luu vao 
            if (key.indexOf('file2Upload')>=0){
              let curdatetime = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/-/g, '').replace(/:/g, '');
              var filenameStored =  curdatetime + "_"
              + files[key].size + "_"
              + files[key].name;
              
              fs.createReadStream(files[key].path)
              .pipe(fs.createWriteStream(dirUpload + systempath.sep + filenameStored))
              ;
              //ghi vao duong dan tuyet doi de khi doc ra, lay anh tu duong dan tuyet doi
              userSave.URL_IMAGE = dirUpload + systempath.sep + filenameStored
            }
          }
          req.userSave = userSave;
          // console.log('Thuc hien dowload file ve luu vao may ghi URL:');
          // console.log(req.user);
          // console.log(req.userSave);
          next();
        }else{
          //tra ve web bao loi va ket thuc
          console.log('Token FormData Post Invalid!');
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            message: 'Auth token is not valid'
          }));
        };
      } else {
        //khong truyen
         res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
         res.end(JSON.stringify({
          success: false,
          message: 'Auth token is not supplied ANY!'
        }));
      }
    });
  }

  //register post
  register(req, res, next) {
    let clientIp= req.ip; //day la dia chi noi
  //tim dia chi WAN nhu sau:
    if (req.headers["client_ip"]){
      clientIp=req.headers["client_ip"];
    }else if (req.headers["x-real-ip"]){
      clientIp=req.headers["x-real-ip"];
    }else if (req.headers["x-forwarded-for"]){
      clientIp=req.headers["x-forwarded-for"];
    }else if (req.headers["remote_add"]){
      clientIp=req.headers["remote_add"];
    }

    const form = new formidable.IncomingForm();

    form.parse(req, function (err, fields, files) {
      let isOKAll = true;
      let username = '';
      let password = '';

      if (err) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          message: err
        }));
      } else {
        for (let key in fields) {
          if (key = 'username') username = fields[key];
          if (key = 'password') password = fields[key];
        }
      }
      let decryptedPassSign = '';
      if (username && password) {
        username = username.toUpperCase();
        try {
          decryptedPassSign = MidlewareRSA.decrypt(password, 'utf8');
          decryptedPassSign = MidlewareRSA.sign(JSON.stringify({
            username: username,
            password: decryptedPassSign //clear password
          }), 'base64');
        } catch (err) {
          isOKAll = false;
        }
      } else {
        isOKAll = false;
      }

      //goi database ghi nhan user
      var userInfo = {
        username: username
        ,password: decryptedPassSign
        ,ip: clientIp
        /* ,nickname: 'cuong.dq'
        ,fullname: 'Đoàn Quốc Cường'
        ,urlImage: 'http://abc.jsp/anhcanhan.jsp'
        ,phone: '903500888'
        ,email: 'cuongdq350088@gmail.com'
        ,address: 'Admin đây mà' */
      }

      if (isOKAll) {
        databaseService.HandleDatabase.createUser(userInfo)
          .then(data => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: true,
              message: 'Đã đăng ký thành công!',
              username: username,
              certificate: decryptedPassSign
            }));
          })
          .catch(err => {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: false,
              message: 'Đăng ký không thành công đâu nhé',
              error: err
            }));
          });
      } else {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          message: 'Lỗi truyền số liệu không đúng'
        }));
      }
    });

  }

  //login post
  login(req, res, next) {

    const form = new formidable.IncomingForm();

    form.parse(req, function (err, fields, files) {

      let isOKAll = true;
      let username = '';
      let password = '';
      if (err) {
        next();
      } else {
        for (let key in fields) {
          if (key = 'username') username = fields[key];
          if (key = 'password') password = fields[key];
        }
      }

      let decryptedPassSign = '';
      if (username && password) {
        username = username.toUpperCase();
        try {
          decryptedPassSign = MidlewareRSA.decrypt(password, 'utf8');
          decryptedPassSign = MidlewareRSA.sign(JSON.stringify({
            username: username,
            password: decryptedPassSign
          }), 'base64');
        } catch (err) {
          isOKAll = false;
        }
      } else {
        isOKAll = false;
      }

      var userInfo = {
        username: username,
        password: decryptedPassSign
      }

      if (isOKAll) {
        databaseService.HandleDatabase.checkUser(userInfo)
          .then(userInfo => {
            if (userInfo) {
              //thuc hien cac noi dung jwt
              req.user = userInfo;
              let tokenLogin = tokenSign(req);

              //su dung sha de certificate nua di?? thi client se khong lay duoc thong tin nay
              // console.log('tokenLogin:');
              // console.log(tokenLogin);

              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({
                success: true,
                message: 'Chúc mừng bạn đã login thành công! Hãy sử dụng thẻ truy cập để yêu cầu dữ liệu của chúng tôi trong 24h tới!',
                token: tokenLogin
              }));
            } else {
              res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({
                success: false,
                message: 'Kiểm tra lại User/pass nhé!'
              }));
            }
          })
          .catch(err => {
            res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
              success: false,
              message: 'Login không thành công-do lỗi query!',
              error: err
            }));
          });

      } else {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          message: 'Lỗi truyền số liệu không đúng!'
        }));
      }
    })
  }

  //log truy cap
  //su duong database luu lai
  logAccess(req, res, next) {
    databaseService.HandleDatabase.logAccess(req, res, next);
  }

  errorProcess(err, req, res, next) {
    res.end(JSON.stringify(err))
  }

  checkRoles(req, res, next) {
    //thay các quyền kiểm tra tại điều kiện kiểm tra nhé
    //*********/
    if (RSAKeyObj) {
      //doi tuong su dung de encrypte, sign, decrypt, verify dung privatekey
      console.log(MidlewareRSA);
      next();
    } else {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'NOK', message: 'Bạn không có quyền vào hệ thống' }));
    }
  }

  getRSAKeyObj(req, res, next) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(RSAKeyObj));
  }

  getSpeedtestServer(req,res,next){
    databaseService.HandleDatabase.getSpeedtestServerList()
    .then(data=>{
       
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    })
    .catch(err=>{
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(err));
    })
  }

  getPublickeyJson(req, res, next) {
    databaseService.HandleDatabase.
      createServiceKey(databaseService.service_id)
      .then(serverkey => {
        //gan vao de su dung lay lai lan sau nhe
        RSAKeyObj = serverkey;
        MidlewareRSA.importKey(serverkey.PRIVATE_KEY);
        //console.log(RSAKeyObj); 
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          SERVICE_ID: serverkey.SERVICE_ID,
          PUBLIC_KEY: serverkey.PUBLIC_KEY,
          SERVICE_NAME: serverkey.SERVICE_NAME,
          IS_ACTIVE: serverkey.IS_ACTIVE
        }));
      })
      .catch(err=>{
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(err));
      })
  }

  cors(req, res, next) {
    res.header("Access-Control-Allow-Methods", "POST, PUT, OPTIONS, DELETE, GET");
    //res.header('Access-Control-Allow-Origin', 'http://localhost:9235');
    //res.header('Access-Control-Allow-Origin', 'http://localhost:8100');
    //res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
    //muon cho phep truy cap tu server nao thi reply cac website tuong ung
    res.header("Access-Control-Allow-Origin", "*"); //khai bao chap nhan tat ca de test
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Credentials", true);
    next();
  }

  getRandomUser(req, res, next) {
    var urlGet = 'https://randomuser.me/api/?results=20';
    //const request = require('request');
    request(urlGet, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        //console.log(body) // Print the google web page.
        //console.log('req!');
        //doc body lay mot anh dai dien?? icon?? 
        res.header('Access-Control-Allow-Origin', '*');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(body);
      } else {
        //console.log(error);
        res.header('Access-Control-Allow-Origin', '*');
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(error));
      }
    });
  }

}


module.exports = {
  db: databaseService, //chuyen db cho server 
  //checkToken: tokenGetCheck, //kiem tra token phuong thuc get (header the same site)
  HandlerGenerator: new HandlerGenerator() //dieu khien 
};
