import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { Injectable } from '@angular/core';
import 'rxjs/add/operator/map'

import NodeRSA from 'node-rsa';
import jwt from 'jsonwebtoken';


@Injectable()
export class ApiService {
  
  public authenticationServer = '';//'https://cuongdq-oauth.herokuapp.com';
  public clientKey = new NodeRSA({ b: 512 }, { signingScheme: 'pkcs1-sha256' }); //for decrypte
  public midleKey =  new NodeRSA(null, { signingScheme: 'pkcs1-sha256' }); //for test
  public serverKey = new NodeRSA(null, { signingScheme: 'pkcs1-sha256' }); //for crypte
  public publicKey:any;
  public userToken:any;
  public userSetting:any;
  public userInfo:any;


  constructor(public httpClient: HttpClient, public sanitizer: DomSanitizer) {
    //key nay de test thu noi bo
    this.midleKey.importKey(this.clientKey.exportKey('public'));
  }

  testEncryptDecrypt(){
    //ma hoa va giai ma du lieu
    const objClient = {
      info: 'Bảng tin cần mã hóa'
    };

    //lay thong tin object dung public key ma hoa
    const encryptedPublicKey = this.midleKey.encrypt(JSON.stringify(objClient), 'base64', 'utf8');
    //console.log('encryptedPublicKey: ', encryptedPublicKey);
    const decryptedPrivateKey = this.clientKey.decrypt(encryptedPublicKey, 'utf8');
    console.log('decryptedPrivateKey: ', decryptedPrivateKey);

    //lay thong tin object dung public key ma hoa
    const encryptedPrivateKey = this.clientKey.encryptPrivate(JSON.stringify(objClient), 'base64', 'utf8');
    //console.log('encryptedPrivateKey: ', encryptedPrivateKey);
    const decryptedPPublicKey = this.midleKey.decryptPublic(encryptedPrivateKey, 'utf8');
    console.log('decryptedPrivateKey: ', decryptedPPublicKey);

  }


  testSignVerify(){
    //Ký và chứng thực
    const objClient = {
      info: 'Bảng tin cần chứng thực'
    };

    //Dùng private key để ký nhận
    const signedPrivateKey = this.clientKey.sign(JSON.stringify(objClient), 'base64');
    console.log('signedPrivateKey: '+ signedPrivateKey);

    //dung public_key de chung thuc chu ky kem van ban co dung khong?
    const verifyPublicKey = this.midleKey.verify(JSON.stringify(objClient), signedPrivateKey, 'utf8', 'base64');
    console.log('verifyPublicKey: ' + verifyPublicKey);

    const verifyPrivateKey = this.clientKey.verify(JSON.stringify(objClient), signedPrivateKey, 'utf8', 'base64');
    console.log('verifyPrivateKey: ' + verifyPrivateKey);

  }

  //get User API the same site
  getUserAPI(){
    if (this.userToken&&this.userToken.token){
      let httpOptions = {
        headers: new HttpHeaders({
          'Authorization': 'Bearer '+ this.userToken.token
        })
      };
      //su dung httpOption khi cung site, 
      //neu khac site thi phai su dung Post kem theo key hoac get theo pramamterter
      return this.httpClient.get('/api',httpOptions)
      .toPromise()
      .then(jsonData => {
        return jsonData;
      });
      
    }else{
      return (new Promise((resolve, reject) => {
            reject({error:'No token, please login first'}); //bao loi khong import key duoc
        }));
    }
  }

  //post from other site JsonString
  postUserAPI(){
    if (this.userToken&&this.userToken.token){
      let jsonRequest = {Authorization: 'Bearer '+ this.userToken.token};
      return this.httpClient.post(this.authenticationServer+'/api',JSON.stringify(jsonRequest))
      .toPromise()
      .then(jsonData => {
        return jsonData;
      });
      
    }else{
      return (new Promise((resolve, reject) => {
            reject({error:'No token, please login first'}); //bao loi khong import key duoc
        }));
    }
  }

  //get UserInfo for setting/edit the same site with headers
  getUserSettings(){
    if (this.userToken&&this.userToken.token){
    let userOptions = {
      headers: new HttpHeaders({
        'Authorization': 'Bearer '+ this.userToken.token
      })
    };
    return this.httpClient.get('/api/user-settings',userOptions)
             .toPromise()
             .then(jsonData => {
              this.userSetting=jsonData;
              return jsonData;
             });
    }else{
      return (new Promise((resolve, reject) => {
            reject({error:'No token, please login first'}); //bao loi khong import key duoc
        }));
    }
  }
  //post UserSettings other site with Token JsonString
  postUserSettings(){
    if (this.userToken&&this.userToken.token){
    let jsonRequest = {Authorization: 'Bearer '+ this.userToken.token};
    return this.httpClient.post(this.authenticationServer+'/api/user-settings',JSON.stringify(jsonRequest))
             .toPromise()
             .then(jsonData => {
              this.userSetting=jsonData;
              return jsonData;
             });
    }else{
      return (new Promise((resolve, reject) => {
            this.userSetting = null;
            reject({error:'No token, please login first'}); //bao loi khong import key duoc
        }));
    }
  }

  //get RSA Public Key for decrypt, encryte any site
  getServerKey(){
      if (this.publicKey && this.publicKey.PUBLIC_KEY){
        return (new Promise((resolve, reject) => {
                  try{
                    this.serverKey.importKey(this.publicKey.PUBLIC_KEY);
                  }catch(err){
                    reject(err); //bao loi khong import key duoc
                  } 
                  resolve(this.serverKey);
              }));
        
      }else{ 
        return this.httpClient.get(this.authenticationServer+'/key-json')
               .toPromise()
               .then(jsonData => {
                this.publicKey = jsonData;
                if (this.publicKey && this.publicKey.PUBLIC_KEY){
                  try{
                    this.serverKey.importKey(this.publicKey.PUBLIC_KEY);
                  }catch(err){
                    throw err;
                  } 
                  return this.serverKey;
                }else{
                  throw new Error('No PUBLIC_KEY exists!');
                }
               });
      }
  }

  //post formdata to any site for login
  postLogin(formData){
    return this.httpClient.post(this.authenticationServer+'/login', formData)
                .toPromise()
                .then(data => {
                    this.userToken=data;
                    return this.userToken.token;
                });
            
  }

  //get token for post or get with authentication
  getUserToken(){
    return this.userToken.token;
  }

  //get userInfo from token
  getUserInfo(){
    //this.userInfo=null;
    try{
      this.userInfo= jwt.decode(this.userToken.token);
      //console.log(this.userInfo);
      //chuyen doi duong dan image de truy cap anh dai dien
      if (this.userInfo.image
          &&
          this.userInfo.image.toLowerCase()
          &&
          this.userInfo.image.toLowerCase().indexOf('http://')<0
          &&
          this.userInfo.image.toLowerCase().indexOf('https://')<0){
          //chuyen doi duong dan lay tai nguyen tai he thong
          this.userInfo.image = this.authenticationServer 
                                  + '/resources/user-image/'
                                  + this.userInfo.image
                                  + '?token='+this.userToken.token;
          //console.log(this.userInfo.image);
      }
    }catch(err){
    }
    return this.userInfo;
  }
  //lay thong tin user lay ra truoc do de edit
  getUserInfoSetting(){
    if (this.userSetting.URL_IMAGE
      &&
      this.userSetting.URL_IMAGE.toLowerCase()
      &&
      this.userSetting.URL_IMAGE.toLowerCase().indexOf('http://')<0
      &&
      this.userSetting.URL_IMAGE.toLowerCase().indexOf('https://')<0){
      //chuyen doi duong dan lay tai nguyen tai he thong
      this.userSetting.URL_IMAGE = this.authenticationServer 
                              + '/resources/user-image/'
                              + this.userSetting.URL_IMAGE
                              + '?token='+this.userToken.token;
      //console.log(this.userSetting.URL_IMAGE);
     }
    return this.userSetting;
  }
  
  //gui dang ky user tu any site
  postRegister(formData){
    return this.httpClient.post(this.authenticationServer+'/register', formData)
                .toPromise()
                .then(data => {
                    return data;
                });
            
  }
  //luu lai du lieu da sua chua
  postUserSave(formData){
    return this.httpClient.post(this.authenticationServer+'/user/save', formData)
                .toPromise()
                .then(data => {
                    return data;
                });
            
  }

  //lay user mau json any site
  getRandomUser(nRecord: number) {
    return this.httpClient.get('https://randomuser.me/api/?results=' + nRecord)
      .map(res => res['results'])
  }

  //lay url any site 
  getHtmlWeb(url: string) {
    //ket qua tra ve la text hay json, neu la text thi phai xu ly chuyen doi html
    //this.sanitizer.bypassSecurityTrustHtml(webhtml)
    return this.httpClient.get(url,{ responseType: 'text'})
       .map(webhtml => webhtml);
  }

  //post the same site CORS 
  postHtmlWeb(url: string, jsonRequest: any) {
    let httpOptions = {
      headers: new HttpHeaders({
        //'Authorization': 'my-auth-token',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/html; text/html'
      })
    };

    return this.httpClient.post(url, jsonRequest, httpOptions)
      .subscribe(webhtml => this.sanitizer.bypassSecurityTrustHtml(webhtml['_body'])
      );
  }


  
}
