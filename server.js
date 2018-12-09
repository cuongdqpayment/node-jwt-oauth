const express = require('express');
//const bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const https = require('https');
const privateKey = fs.readFileSync('cert/private_key.pem', 'utf8');
const certificate = fs.readFileSync('cert/certificate.pem', 'utf8');

const credentials = { key: privateKey, cert: certificate };
const os = require('os');

let middleware = require('./jwt/middleware');

/**
 * CAC CONTENT_TYPE TRA VE CLIENT LUU Y NHU SAU:
 * 1. TRA JSON KET QUA DUNG: DEFAULT LA UTF-8
 * res.writeHead(200, { 'Content-Type': 'application/json'});
 * 2. TRA JSON KET QUA SAI:
 * res.writeHead(404, { 'Content-Type': 'application/json'});
 * 3. TRA VE WEB HTML: Dung la 200/sai la 404
 * res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8' });
 * 4. TRA VE FILE UNG DUNG: Dung la 200
 * res.writeHead(200, {'Content-Type': mime.lookup(filename) });
 * 
 */
// Starting point of the server
function main(isHttp, isHttps) {

  let app = express(); // Export app for other routes to use
  
  //khoi tao trung gian xu ly dieu khien tao token, database
  let handlers = middleware.HandlerGenerator;
  //khoi tao lay bien public su dung sau
  handlers.init();
  //OK cuong.dq
  
  //chuyen doi du lieu json dau vao thanh req.body la doi tuong chua json
  //app.use(bodyParser.json());
  
  //thiet lap cac tham so header dieu khien chung
  //cho phep goi qua ajax ...
  app.use(handlers.cors);
  
  //CHONG TAN CONG DDDOS
  //ngan chan truy cap ddos tra ket qua cho user neu truy cap tan suat lon 
  app.use(require('./ddos/config').express('ip', 'path'));
  
  //1.dang ky duong dan tuyet doi co dinh cho ionic
  app.use(express.static(__dirname + '/www'));
  
  //luu log truy cap chi luu log nguoi dung login su dung tai nguyen thoi
  app.use(handlers.logAccess);

  //Tra khoa public cho client
  app.get('/key-json', handlers.getPublickeyJson);
  app.get('/speedtest-server', handlers.getSpeedtestServer);
  
  //Tra bo khoa RSA cho admin xu ly, chi co quyen admin moi su dung duoc
  app.get('/admin-json', handlers.checkRoles, handlers.getRSAKeyObj);
  
  // Routes & Handlers
  app.post('/login', handlers.login);
  
  //Register user gửi lên form đăng ký
  app.post('/register', handlers.register);
  
  //luu du lieu xuong database Post kieu Formdata
  app.post('/user/save',handlers.tokenPostFormCheck, middleware.db.HandleDatabase.saveUserInfo);
  //kiem tra token hop le hay khong, neu khong hop le thi tra ve trang chu
  //neu hop le thi tra ket qua ve Post kieu JSON.stringify({})
  app.post('/api', handlers.tokenPostCheck, handlers.getRandomUser);
  app.post('/api/user-settings', handlers.tokenPostCheck, middleware.db.HandleDatabase.getUserInfo);
  
  //lay tai nguyen he thong qua token da cap 
  var resources = require('./routes/get-resources');
  app.use('/resources', handlers.tokenGetParamsCheck, resources);

  //Get Kieu Header Authenticate, the same site CORS control
  app.get('/api', handlers.tokenGetCheck, handlers.getRandomUser);
  app.get('/api/user-settings', handlers.tokenGetCheck, middleware.db.HandleDatabase.getUserInfo);



  //de truyen csdl vao doi tuong nao viet ham nhu sau
  /* app.use((res,res,next)=>{
      //callFunction(req,res,next,middleware.db)
  }); */


  //ham tra loi cac dia chi khong co
  //The 404 Route (ALWAYS Keep this as the last route)
  app.all('*',(req, res) => {
    //gui trang thai bao noi dung tra ve
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>Đừng tìm kiếm vô ích. Đố mầy hack đấy!</h1>Are You Lazy???');
  });

  //ham xu ly loi cuoi cung
  app.use(handlers.errorProcess);

  if (isHttp) {
    // your express configuration here
    // For http
    const httpServer = http.createServer(app);
    const portHttp = process.env.PORT || isHttp;
    httpServer.listen(portHttp, () => {
      console.log("Server HTTP (" + os.platform() + "; " + os.arch() + ") is started with PORT: "
        + portHttp
        + "\n tempdir: " + os.tmpdir()
        + "\n " + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
      );
    });
  }

  if (isHttps) {
    // For https
    const portHttps = process.env.PORT || isHttps;
    const httpsServer = https.createServer(credentials, app);
    httpsServer.listen(portHttps, () => {
      console.log("Server HTTPS (" + os.platform() + "; " + os.arch() + ") is started with PORT: "
        + portHttps
        + "\n tempdir: " + os.tmpdir()
        + "\n " + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
      );
    });
  }
}

//=false or port number >1000
const isHttp = 9235;
const isHttps = false //8443; 

main(isHttp, isHttps);