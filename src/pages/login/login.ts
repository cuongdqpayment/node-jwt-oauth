import { Component } from '@angular/core';
import { NavController,LoadingController,AlertController,ToastController } from 'ionic-angular';
import { FormGroup, FormBuilder } from '@angular/forms';
import { RegisterPage } from '../register/register';
import { SettingPage } from '../setting/setting';
import { ApiAuthService } from '../../services/apiAuthService';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html'
})
export class LoginPage {

  public myFromGroup: FormGroup;
  public isImageViewer: boolean = false;
  public resourceImages: {imageViewer: any,file:any, name: string }[] = [];
  public serverKeyPublic:any; //PUBLIC_KEY
  public serverTokenUserInfo:any;  //token for login ok
  public isShowInfo:boolean=false;
  
  constructor(public navCtrl: NavController,
              private formBuilder: FormBuilder,
              private alertCtrl: AlertController,
              private loadingCtrl: LoadingController,
              private toastCtrl: ToastController,
              private apiService: ApiAuthService) { }

  ngOnInit() {

    this.apiService.getServerPublicRSAKey()
    .then(pk=>{
        //lay public key 
        //console.log(pk);
        this.serverKeyPublic= pk;
        //va user info neu co
        this.serverTokenUserInfo = this.apiService.getUserInfo();
        //neu thong tin nguoi dung co thi hien thi user, va logout

    })
    .catch(err=>console.log(err));
    
    

    this.myFromGroup = this.formBuilder.group({
      user: 'cuongdq',
      pass: '123'
    });

  }

  onSubmit() {
    var passEncrypted='';
    try{
      passEncrypted = this.serverKeyPublic.encrypt(this.myFromGroup.get('pass').value, 'base64', 'utf8');
    }catch(err){
      console.log(err);
    }

    var formData: FormData = new FormData();
    formData.append("username",this.myFromGroup.get('user').value);
    formData.append("password",passEncrypted);
    
    //gui lenh login 
    let loading = this.loadingCtrl.create({
      content: 'Saving user info...'
    });
    loading.present();

    this.apiService.login(formData)
    .then(token=>{
      if (token){
        loading.dismiss();
          
      this.alertCtrl.create({
          title: 'Login success',
          subTitle: 'Welcome to system!',
          buttons: ['OK']
        }).present();
        
        //console.log(this.apiService.getUserInfo());
        this.serverTokenUserInfo = this.apiService.getUserInfo();
        this.isShowInfo=true;
        //this.navCtrl.setRoot(LoginPage);

      }else{
        throw {code:403,message:'No token'}
      }
    })
    .catch(err=>{
      loading.dismiss();
      this.toastCtrl.create({
        message:"result: " + JSON.stringify(err),
        duration: 5000,
        position: 'bottom'
      }).present();
    }
    );
    
  }

  callRegister(){
    //console.log("goi dang ky")
    this.navCtrl.push(RegisterPage);
  }

  callLogout(){
    this.apiService.logout();
    this.isShowInfo=false;
    this.navCtrl.setRoot(LoginPage);
  }

  callEdit(){
    //neu cung site thi su dung Header de truyen token
    //neu khac site thi phai su dung param hoac post json token
    this.apiService.getEdit()
    .then(user=>{
      //console.log(this.apiService.getUserInfoSetting());
      this.navCtrl.push(SettingPage);
      //dong lai menu neu no dang mo
    })
    .catch(err=>{
      
      this.toastCtrl.create({
        message:"err get API: : " + JSON.stringify(err),
        duration: 5000,
        position: 'bottom'
      }).present();
    }); 
  }
}
