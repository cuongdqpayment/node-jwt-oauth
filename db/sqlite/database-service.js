const fs = require('fs');
const url = require('url');

//khoi tao NodeRSA de truyen nhan du lieu, ma hoa
const NodeRSA = require('node-rsa');

//chen 2 doi tuong su dung cho sqlite - cuongdq
const AppDAO = require('./lib/sqlite-dao');
const dataType = require('./lib/sqlite-datatype');
const config = require('./lib/config');
const isSilence = config.keep_silence;

const dirDB = 'db';

if (!fs.existsSync(dirDB)) {
    fs.mkdirSync(dirDB);
}
var db = new AppDAO('./' + dirDB + '/'+config.database_name);

//bien lay key sau nay qua class
var serverKey = new NodeRSA(null, { signingScheme: 'pkcs1-sha256' });
var RSAKeyRow;
class HandleDatabase {
    //khoi tao cac bang luu so lieu
    init(){
        //tao bang chua key
        //bang du lieu luu RSA cua server
        let createServerRSAKeyTable ={
            name: 'SERVER_KEYS',
            cols: [
                {
                    name: 'SERVICE_ID',
                    type: dataType.text,
                    option_key: 'PRIMARY KEY NOT NULL',
                    description: 'Mã ID của Từng dịch vụ có key riêng theo từng hệ thống'
                },
                {
                    name: 'PRIVATE_KEY',
                    type: dataType.text,
                    option_key: 'NOT NULL',
                    description: 'Mã khóa riêng cho dịch vụ này được tạo ra một lần'
                },
                {
                    name: 'PUBLIC_KEY',
                    type: dataType.text,
                    option_key: 'NOT NULL',
                    description: 'Mã khóa riêng cho dịch vụ này được tạo ra một lần'
                },
                {
                    name: 'SERVICE_NAME',
                    type: dataType.text,
                    option_key: '',
                    description: 'Tên của dịch vụ này mô tả'
                },
                {
                    name: 'IS_ACTIVE',
                    type: dataType.numeric,
                    option_key: 'default 1',
                    description: 'Trạng thái dịch vụ, không tạo rowid '
                }
            ]
        };
        
        db.createTable(createServerRSAKeyTable).then(data=>{ 
            if (!isSilence) console.log(data);
            //tao xong db, lay RSAKey su dung chung
            //console.log('TAO TABE KEY XONG:');
            this.createServiceKey(config.service_key)
            .then(RSAKey=>{
                //gan cho bien toan cuc se lay lai bien toan cuc qua ham
                RSAKeyRow = RSAKey;
                //console.log('RSAKeyRow create dba table: KEYS');
                //console.log(RSAKeyRow); //null
                //ma hoa mat khau va tao user admin
                this.createAdminUser(RSAKeyRow);
                //tao xong
            })
        });

        //bang ghi du lieu truy cap
        let createTableSocialUsers ={
            name: 'SOCIAL_USERS',
            cols: [
                {
                    name: 'ID', //id duy nhat cua he thong de quan ly 
                    type: dataType.integer,
                    option_key: 'PRIMARY KEY AUTOINCREMENT NOT NULL',
                    description: 'Mã ID của User là duy nhất của hệ thống này không quản lý rowid'
                },
                {
                    name: 'PROVIDER_ID',
                    type: dataType.text,
                    option_key: 'NOT NULL',
                    description: 'Mã ID của User là duy nhất theo từng hệ thống'
                },
                {
                    name: 'PROVIDER',
                    type: dataType.text,
                    option_key: 'NOT NULL',
                    description: 'Nhà cung cấp dịch vụ xác thực như facebook, google, local'
                },
                {
                    name: 'DISPLAY_NAME',
                    type: dataType.text,
                    option_key: '',
                    description: 'displayName Tên hiển thị của người dùng trên mạng xã hội'
                },
                {
                    name: 'URL_IMAGE',
                    type: dataType.text,
                    option_key: '',
                    description: 'Đường dẫn url ảnh đại diện'
                },
                {
                    name: 'FULL_NAME',
                    type: dataType.text,
                    option_key: '',
                    description: 'Họ và tên quản lý đầy đủ của hệ thống riêng'
                },
                {
                    name: 'PHONE',
                    type: dataType.text,
                    option_key: '',
                    description: 'Số điện thoại được cung cấp bởi người dùng hoặc lấy từ mạng xã hội'
                },
                {
                    name: 'PHONE_OTP',
                    type: dataType.text,
                    option_key: '',
                    description: 'Mã xác nhận OTP của user'
                },
                {
                    name: 'PHONE_OTP_ACTIVE',
                    type: dataType.text,
                    option_key: '',
                    description: 'Trạng thái đã xác nhận mã OTP qua điện thoại xong, số điện thoại đã được xác minh'
                },
                {
                    name: 'EMAIL',
                    type: dataType.text,
                    option_key: '',
                    description: 'Địa chỉ email của người dùng hệ thống hoặc mạng xã hội'
                },
                {
                    name: 'EMAIL_OTP',
                    type: dataType.text,
                    option_key: '',
                    description: 'Mã OTP để xác thực email khi người dùng comfirm'
                },
                {
                    name: 'EMAIL_OTP_ACTIVE',
                    type: dataType.numeric,
                    option_key: '',
                    description: 'Trạng thái đã xác thực OTP email chứng thực người dùng khai báo email đúng'
                },
                {
                    name: 'FULL_ADDRESS',
                    type: dataType.text,
                    option_key: '',
                    description: 'Địa chỉ quản lý đầy đủ của hệ thống riêng'
                },
                {
                    name: 'ROLES',
                    type: dataType.text,
                    option_key: '',
                    description: 'Vai trò của người dùng trong hệ thống này'
                },
                {
                    name: 'COUNT_IP',
                    type: dataType.integer,
                    option_key: 'default 0',
                    description: 'Số lượng IP mà user này sử dụng danh sách được quản lý bằng bản chi tiết'
                },
                {
                    name: 'LAST_IP',
                    type: dataType.text,
                    option_key: '',
                    description: 'Địa chỉ ip cuối truy cập hệ thống'
                },
                {
                    name: 'LAST_ACCESS_TIME',
                    type: dataType.text,
                    option_key: '',
                    description: 'Thời gian truy cập cuối hệ thống'
                },
                {
                    name: 'LAST_ACCESS_URL',
                    type: dataType.text,
                    option_key: '',
                    description: 'Link truy cập cuối cùng dùng để trỏ về kết quả gần nhất cho họ'
                },
                {
                    name: 'LAST_STATUS',
                    type: dataType.numeric,
                    option_key: 'default 0',
                    description: 'Trạng thái truy cập lần gần nhất 0, 1, 2, 3'
                },
                {
                    name: 'COUNT_ACCESS',
                    type: dataType.numeric,
                    option_key: 'default 0',
                    description: 'Số lượt truy cập hệ thống này'
                },
                {
                    name: 'TOKEN_ID',
                    type: dataType.text,
                    option_key: '',
                    description: 'Mã Token truy cập hệ thống duy trì'
                },
                {
                    name: 'IS_ACTIVE',
                    type: dataType.numeric,
                    option_key: 'default 1, unique(PROVIDER_ID, PROVIDER)',
                    description: 'Quyền truy cập hệ thống, =0 là bị block không cho truy cập'
                }
            ]
        };
        
        db.createTable(createTableSocialUsers).then(data=>{ if (!isSilence) console.log(data)
                                         });
        
        let createTableLocalUsers ={
            name: 'LOCAL_USERS',
            cols: [
                {
                    name: 'ID', //id duy nhat cua he thong de quan ly 
                    type: dataType.integer,
                    option_key: 'PRIMARY KEY AUTOINCREMENT NOT NULL',
                    description: 'Mã ID của User là duy nhất của hệ thống này không quản lý rowid'
                },
                {
                    name: 'USERNAME',
                    type: dataType.text,
                    option_key: 'NOT NULL',
                    description: 'Username của hệ thống cung cấp duy nhất sử dụng điện thoại hoặc email'
                },
                {
                    name: 'PASSWORD',
                    type: dataType.text,
                    option_key: 'NOT NULL',
                    description: 'Mật khẩu người dùng local được mã hóa dưới dạng certificate'
                },
                {
                    name: 'SOCIAL_USER_ID',
                    type: dataType.integer,
                    option_key: '',
                    description: 'Mã ID của User Nếu liên kết từ mạng xã hội'
                },
                {
                    name: 'DISPLAY_NAME',
                    type: dataType.text,
                    option_key: '',
                    description: 'displayName Tên hiển thị của người dùng trên mạng xã hội'
                },
                {
                    name: 'URL_IMAGE',
                    type: dataType.text,
                    option_key: '',
                    description: 'Đường dẫn url ảnh đại diện'
                },
                {
                    name: 'FULL_NAME',
                    type: dataType.text,
                    option_key: '',
                    description: 'Họ và tên quản lý đầy đủ của hệ thống riêng'
                },
                {
                    name: 'PHONE',
                    type: dataType.text,
                    option_key: '',
                    description: 'Số điện thoại được cung cấp bởi người dùng hoặc lấy từ mạng xã hội'
                },
                {
                    name: 'EMAIL',
                    type: dataType.text,
                    option_key: '',
                    description: 'Địa chỉ email của người dùng hệ thống hoặc mạng xã hội'
                },
                {
                    name: 'FULL_ADDRESS',
                    type: dataType.text,
                    option_key: '',
                    description: 'Địa chỉ quản lý đầy đủ của hệ thống riêng'
                },
                {
                    name: 'ROLES',
                    type: dataType.text,
                    option_key: '',
                    description: 'Vai trò của người dùng trong hệ thống này, admin = 99'
                },
                {
                    name: 'COUNT_IP',
                    type: dataType.integer,
                    option_key: 'default 0',
                    description: 'Số lượng IP mà user này sử dụng danh sách được quản lý bằng bản chi tiết'
                },
                {
                    name: 'LAST_IP',
                    type: dataType.text,
                    option_key: '',
                    description: 'Địa chỉ ip cuối truy cập hệ thống'
                },
                {
                    name: 'LAST_ACCESS_TIME',
                    type: dataType.text,
                    option_key: '',
                    description: 'Thời gian truy cập cuối hệ thống'
                },
                {
                    name: 'LAST_ACCESS_URL',
                    type: dataType.text,
                    option_key: '',
                    description: 'Link truy cập cuối cùng dùng để trỏ về kết quả gần nhất cho họ'
                },
                {
                    name: 'LAST_STATUS',
                    type: dataType.numeric,
                    option_key: 'default 0',
                    description: 'Trạng thái truy cập lần gần nhất 0, 1, 2, 3'
                },
                {
                    name: 'COUNT_ACCESS',
                    type: dataType.numeric,
                    option_key: 'default 0',
                    description: 'Số lượt truy cập hệ thống này'
                },
                {
                    name: 'TOKEN_ID',
                    type: dataType.text,
                    option_key: '',
                    description: 'Mã Token truy cập hệ thống duy trì'
                },
                {
                    name: 'IS_ACTIVE',
                    type: dataType.numeric,
                    option_key: 'default 1, unique(USERNAME)',
                    description: 'Quyền truy cập hệ thống, =0 là bị block không cho truy cập'
                }
            ]
        };
        
        db.createTable(createTableLocalUsers).then(data=>{
            if (!isSilence) console.log(data);
            //sau khi bang dia phuong tao
            //thi tao user addmin
            //dam bao key duoc tao truoc moi dam bao login sau
        });
        
        let createLogAccessTable ={
            name: 'LOG_ACCESS',
            cols: [
                {
                    name: 'IP',
                    type: dataType.text,
                    option_key: 'NOT NULL UNIQUE',
                    description: 'Key duy nhat quan ly'
                },
                {
                    name: 'LOG_COUNT',
                    type: dataType.integer,
                    option_key: 'DEFAULT 1',
                    description: 'So lan truy cap'
                },
                {
                    name: 'LAST_ACCESS',
                    type: dataType.text,
                    option_key: '',
                    description: 'Thoi gian truy cap gan nhat'
                },
                {
                    name: 'ACCESS_INFO',
                    type: dataType.text,
                    option_key: '',
                    description: 'Thong tin truy cap'
                },
                {
                    name: 'DEVICE_INFO',
                    type: dataType.text,
                    option_key: '',
                    description: 'Thong tin may'
                },
                {
                    name: 'LOCATION',
                    type: dataType.text,
                    option_key: '',
                    description: 'VI TRI'
                }
            ]
        };
        
        db.createTable(createLogAccessTable).then(data=>{if (!isSilence) console.log(data)
        });
        
        let createLogAccessDetailsTable ={
            name: 'LOG_ACCESS_DETAILS',
            cols: [
                {
                    name: 'IP',
                    type: dataType.text,
                    option_key: 'NOT NULL',
                    description: 'Key duy nhat quan ly'
                },
                {
                    name: 'ACCESS_INFO',
                    type: dataType.text,
                    option_key: 'NOT NULL',
                    description: 'Thong tin truy cap'
                },
                {
                    name: 'LOG_COUNT',
                    type: dataType.integer,
                    option_key: 'DEFAULT 1',
                    description: 'So lan truy cap'
                },
                {
                    name: 'LAST_ACCESS',
                    type: dataType.text,
                    option_key: '',
                    description: 'Thoi gian truy cap gan nhat'
                },
                {
                    name: 'DEVICE_INFO',
                    type: dataType.text,
                    option_key: '',
                    description: 'Thong tin may'
                },
                {
                    name: 'LOCATION',
                    type: dataType.text,
                    option_key: ', unique(IP, ACCESS_INFO)',
                    description: 'VI TRI, va cau lenh unique'
                }
            ]
        };
        
        db.createTable(createLogAccessDetailsTable).then(data=>{if (!isSilence) console.log(data)
        });
        
    } //end init
    
    //neu chua co thi khoi tao
    getServiceKey(service_id){
        if (RSAKeyRow){
            console.log('RSAKeyRow');
            console.log(RSAKeyRow);
            
            return (new Promise((resolve, reject) => {
                try{
                  serverKey.importKey(RSAKeyRow.PRIVATE_KEY);
                }catch(err){
                  reject(err); //bao loi khong import key duoc
                } 
                resolve(serverKey);
            }));
        }else{
            console.log('createServiceKey');
            
            return this.createServiceKey(service_id)
            .then(data=>{
                RSAKeyRow = data;
                console.log('RSAKeyRow 2:');
                console.log(RSAKeyRow);
                if (RSAKeyRow){
                    try{
                        serverKey.importKey(RSAKeyRow.PRIVATE_KEY);
                      }catch(err){
                        throw err; //bao loi khong import key duoc
                      } 
                }else{
                    throw {code:403,message:'No RSAKeyRow'}
                }
            })
        }
    }

    //log truy cap tu request
    logAccess(req, res, next){
       //doan lay thong tin cac bien su dung sau nay
    var reqUrlString = req.url;
    var method = req.method;
    var pathName = decodeURIComponent(url.parse(reqUrlString, true, false).pathname);
    var reqFullHost = req.protocol + '://' + req.get('host');
    
    var log = {
        name: 'LOG_ACCESS',
        cols: [{
            name: 'IP',
            value: req.ip
        },
        {
            name: 'ACCESS_INFO',
            value: method + " " + reqFullHost + '/' + pathName
        },
        {
            name: 'DEVICE_INFO',
            value: req.headers["user-agent"]
        }
        ],
        wheres: [{
            name: 'IP',
            value: req.ip
        }]
    };
    db.insert(log)
      .then(data => {
        if (!isSilence) console.log(data)
        }
      )
      .catch(err=>{
          db.runSql("update LOG_ACCESS set LOG_COUNT=LOG_COUNT+1 where IP='"+req.ip+"'")
          .then(data=>{
            if (!isSilence) console.log(data)
          })
      });
    //-----------------------------------------
    //tra den phien tiep theo
    next(); 
    }

    //getKey de su dung dich vu
    createServiceKey(service_id){
        
        //console.log('BAT DAU TAO KEY: ');
        var serviceKeyId = (service_id)?service_id:config.service_key;
        //doi thoi gian de no tao bang csdl truoc khi tao du lieu

        return db.getRst("select * from SERVER_KEYS where SERVICE_ID='"+serviceKeyId+"'")
        .then(row=>{
            if (row){
                //console.log('Lay tu csdl:');
                return row;
            }else{
                
                let key = new NodeRSA({ b: 512 }, { signingScheme: 'pkcs1-sha256' });
                //console.log('KHONG CO TRONG CSDL NEN BAT DAU TAO:');
                let insertTable={ name:'SERVER_KEYS',
                cols:[
                        {
                        name:'SERVICE_ID',
                        value: serviceKeyId
                        },
                        {
                        name:'PRIVATE_KEY',
                        value: key.exportKey('private')
                        },
                        {
                        name:'PUBLIC_KEY',
                        value: key.exportKey('public')
                        },
                        {
                        name:'SERVICE_NAME',
                        value: 'Khóa của dịch vụ web c3'
                        }
                    ]
                };
                return db.insert(insertTable).then(data=>{
                    if (!isSilence) console.log(data);
                    return { SERVICE_ID: serviceKeyId,
                            PRIVATE_KEY: key.exportKey('private'),
                            PUBLIC_KEY: key.exportKey('public'),
                            SERVICE_NAME: 'Khóa của dịch vụ web c3',
                            IS_ACTIVE: 1 };
                });
            }
        })
    }

    //dua key object vao
    createAdminUser(keyObject){
        if (keyObject&&keyObject.PRIVATE_KEY&&keyObject.PUBLIC_KEY){
            if (!isSilence) console.log(keyObject.PUBLIC_KEY);
            let username='ADMIN';
            let password='Cng@3500888';
            let decryptedPassSign='';
            var MidlewareRSA = new NodeRSA(null, { signingScheme: 'pkcs1-sha256' });
            MidlewareRSA.importKey(keyObject.PRIVATE_KEY);
            try {
                decryptedPassSign = MidlewareRSA.sign(JSON.stringify({
                  username: username,
                  password: password
                }), 'base64');
                let userInfo = {
                    username: username
                    ,password: decryptedPassSign
                    ,ip: 'any'
                    ,roles:'99' //vai tro cua quan tri he thong
                    ,nickname: 'Quản trị hệ thống'
                    ,fullname: 'Đoàn Quốc Cường'
                    ,urlImage: 'https://lavaprotocols.com/wp-content/uploads/2014/09/google-apps-admin-panel-icon.png'
                    ,phone: '903500888'
                    ,email: 'cuongdq350088@gmail.com'
                    ,address: 'Admin đây mà'
                  }

                this.createUser(userInfo)
                .then(data=>{
                    if (!isSilence) {
                        console.log('------>TAO ADMIN: ' + data);
                        console.log(userInfo);
                    }
                    
                })
                .catch(err=>{
                    console.log(err);
                })
                ;
    
              } catch (err) {
                console.log(err);
              }

        }

    }
    createUser(userInfo){
        var userInfoSQL ={
            name: 'LOCAL_USERS',
            cols: [
                {
                    name: 'USERNAME',
                    value: userInfo.username
                },
                {
                    name: 'PASSWORD',
                    value: userInfo.password
                },
                {
                    name: 'DISPLAY_NAME',
                    value: userInfo.nickname
                },
                {
                    name: 'URL_IMAGE',
                    value: userInfo.urlImage
                },
                {
                    name: 'FULL_NAME',
                    value: userInfo.fullname
                },
                {
                    name: 'PHONE',
                    value: userInfo.phone
                },
                {
                    name: 'EMAIL',
                    value: userInfo.email
                },
                {
                    name: 'FULL_ADDRESS',
                    value: userInfo.address
                },
                {
                    name: 'LAST_IP',
                    value: userInfo.ip
                },
                {
                    name: 'ROLES',
                    value: userInfo.roles
                },
                {
                    name: 'TOKEN_ID',
                    value: userInfo.token
                }
            ]
        };

    return db.insert(userInfoSQL)
      .then(data => {
        if (!isSilence) console.log(data);
        return true; //excuted du lieu thanh cong
        }
      )
    }
    
    updateUser(userInfo){
        //password thi hash duoi dang certificate tuc la sign
        var userInfoSQL ={
            name: 'LOCAL_USERS',
            cols: [
                {
                    name: 'PASSWORD',
                    value: userInfo.password
                },
                {
                    name: 'DISPLAY_NAME',
                    value: userInfo.nickname
                },
                {
                    name: 'URL_IMAGE',
                    value: userInfo.urlImage
                },
                {
                    name: 'FULL_NAME',
                    value: userInfo.fullname
                },
                {
                    name: 'PHONE',
                    value: userInfo.phone
                },
                {
                    name: 'EMAIL',
                    value: userInfo.email
                },
                {
                    name: 'FULL_ADDRESS',
                    value: userInfo.address
                },
                {
                    name: 'LAST_IP',
                    value: userInfo.ip
                },
                {
                    name: 'ROLES',
                    value: userInfo.roles
                },
                {
                    name: 'TOKEN_ID',
                    value: userInfo.token
                }
            ],
            wheres: [
                {
                    name: 'USERNAME',
                    value: userInfo.username
                }
                    ]
        };

        return db.update(userInfoSQL)
        .then(data => {
                if (!isSilence) console.log(data);
                return data;
        }
        )
        .catch(err=>{
            if (!isSilence) console.log(err);
            return err;
        });
    }

    comfirmUser(userInfo){
        //xac nhan OTP thong tin gui ve user kiem tra OTP
        //
    }

    //verify user&pass for login
    checkUser(userInfo){
        //password thi hash duoi dang certificate tuc la sign
        var userInfoSQL ={
            name: 'LOCAL_USERS',
            cols: [
                {
                    name: 'USERNAME'
                },
                {
                    name: 'DISPLAY_NAME'
                },
                {
                    name: 'URL_IMAGE'
                },
                {
                    name: 'FULL_NAME'
                },
                {
                    name: 'PHONE'
                },
                {
                    name: 'EMAIL'
                },
                {
                    name: 'FULL_ADDRESS'
                },
                {
                    name: 'LAST_IP'
                },
                {
                    name: 'TOKEN_ID'
                }
            ],
            wheres: [
                {
                    name: 'USERNAME',
                    value: userInfo.username
                },
                {
                    name: 'PASSWORD',
                    value: userInfo.password
                }
                    ]
        };

        return db.select(userInfoSQL)
        .then(data => {
            if (data){
                if (!isSilence) console.log(data)
                return data;
            }else{ //khong tim thay user nen tra ve loi thoi
                //tra loi xuong catch ben duoi xem Promise trong Nodejs test
                throw {code:403
                       ,message:'Please check username & password again!'};
            }
        }
        );
    }
    //get userInfo sau khi da verify quyen
    getUserInfo(req, res, next){
        if (req.user&&req.user.username){
            //console.log(req.user);
            var userInfoSQL ={
                name: 'LOCAL_USERS',
                cols: [
                    {
                        name: 'USERNAME'
                    },
                    {
                        name: 'DISPLAY_NAME'
                    },
                    {
                        name: 'URL_IMAGE'
                    },
                    {
                        name: 'FULL_NAME'
                    },
                    {
                        name: 'PHONE'
                    },
                    {
                        name: 'EMAIL'
                    },
                    {
                        name: 'FULL_ADDRESS'
                    },
                    {
                        name: 'LAST_IP'
                    },
                    {
                        name: 'TOKEN_ID'
                    }
                ],
                wheres: [
                    {
                        name: 'USERNAME',
                        value: req.user.username
                    }
                        ]
            };
    
            db.select(userInfoSQL)
            .then(data => {
                if (data){
                    if (!isSilence) console.log(data);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(data));
                }else{
                    //tra loi xuong catch ben duoi
                    throw {code:403
                        ,message:'No username '+ req.user.username + ' exists!'};
                }
            })
            .catch(err=>{
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(err));
            });
        }else{
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({message:"No User Info!"}));
        }
    }

    saveUserInfo(req,res,next){
        //req.user, req.userSave la 2 thanh phan duoc parse tu verify token
        if (req.user&&req.user.username&&req.userSave){
            //luu vao csdl
            var userInfoSQLSave ={
                name: 'LOCAL_USERS',
                cols: [
                    {
                        name: 'USERNAME',
                        value:req.user.username
                    },
                    {
                        name: 'DISPLAY_NAME',
                        value: req.userSave.DISPLAY_NAME
                    },
                    {
                        name: 'URL_IMAGE',
                        value: req.userSave.URL_IMAGE
                    },
                    {
                        name: 'FULL_NAME'
                        ,value: req.userSave.FULL_NAME
                    },
                    {
                        name: 'PHONE'
                        ,value: req.userSave.PHONE
                    },
                    {
                        name: 'EMAIL'
                        ,value: req.userSave.EMAIL
                    },
                    {
                        name: 'FULL_ADDRESS'
                        ,value: req.userSave.FULL_ADDRESS
                    }
                ],
                wheres: [
                    {
                        name: 'USERNAME',
                        value: req.user.username
                    }
                        ]
            };
            db.update(userInfoSQLSave)
            .then(data=>{
                //console.log(data);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({status:'OK'
                                        ,message:'Lưu thành công'
                                        ,nickname:req.userSave.DISPLAY_NAME // tra ve nickname va image moi update
                                        ,URL_IMAGE:req.userSave.URL_IMAGE //
                                        ,username:req.user.username}));
            })
            .catch(err=>{
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify(err));
            })

        }else{
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({message:"No User Info!"}));
        }
    }

}

module.exports = {
    //la doi tuong database su dung cac lenh
    db:db,
    //service_id ma dich vu 
    service_id: config.service_key,
    //dieu khien luu tru csdl
    HandleDatabase: new HandleDatabase()
};