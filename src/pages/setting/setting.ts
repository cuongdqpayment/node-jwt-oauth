import { Component } from '@angular/core';
import { NavController, ToastController, AlertController, LoadingController } from 'ionic-angular';
import { FormGroup, FormBuilder } from '@angular/forms';
import { ApiAuthService } from '../../services/apiAuthService';
import { LoginPage } from '../login/login';
import { ApiImageService } from '../../services/apiImageService';
import { ApiStorageService } from '../../services/apiStorageService';


@Component({
  selector: 'page-setting',
  templateUrl: 'setting.html'
})
export class SettingPage {

  public myFromGroup: FormGroup;
  public isImageViewer: boolean = false;
  public resourceImages=[]//: { imageViewer: any, file: any, name: string }[] = [];
  public serverKey: any;
  public userInfo: any;

  constructor(
    private navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private formBuilder: FormBuilder,
    private apiImageService: ApiImageService,
    private apiStorageService: ApiStorageService,
    private apiService: ApiAuthService) { }

  ngOnInit() {
    this.apiService.getServerPublicRSAKey()
      .then(pk => this.serverKey = pk)
      .catch(err => console.log(err));

    this.userInfo = this.apiService.getUserInfoSetting()

    this.myFromGroup = this.formBuilder.group({
      DISPLAY_NAME: (this.userInfo) ? this.userInfo.DISPLAY_NAME : '',
      FULL_NAME: (this.userInfo) ? this.userInfo.FULL_NAME : '',
      PHONE: (this.userInfo) ? this.userInfo.PHONE : '',
      EMAIL: (this.userInfo) ? this.userInfo.EMAIL : '',
      FULL_ADDRESS: (this.userInfo) ? this.userInfo.FULL_ADDRESS : '',
      fileload: '',
    });
  }



  fileChange(event) {
    if (event.target && event.target.files) {
      const files: { [key: string]: File } = event.target.files;
      for (let key in files) { //index, length, item
        if (!isNaN(parseInt(key))) {
          this.apiImageService.resizeImage(files[key].name,files[key],300)
          .then(data=>{
            this.resourceImages.push(data);
            this.isImageViewer = true;
          })
          .catch(err=>{
            console.log(err);
          })
        }
      }//
    }
  }


  deleteImage(evt) {
    this.resourceImages = this.resourceImages.filter((value, index, arr) => {
      return value != evt;
    });
  }
  //thuc hien submit
  onSubmit() {

    var formData: FormData = new FormData();
    formData.append("Authorization", 'Bearer ' + this.apiService.getUserToken());
    if (this.myFromGroup.get("DISPLAY_NAME").value)
      formData.append("DISPLAY_NAME", this.myFromGroup.get("DISPLAY_NAME").value);
    if (this.myFromGroup.get("FULL_NAME").value)
      formData.append("FULL_NAME", this.myFromGroup.get("FULL_NAME").value);
    if (this.myFromGroup.get("PHONE").value)
      formData.append("PHONE", this.myFromGroup.get("PHONE").value);
    if (this.myFromGroup.get("EMAIL").value)
      formData.append("EMAIL", this.myFromGroup.get("EMAIL").value);
    if (this.myFromGroup.get("FULL_ADDRESS").value)
      formData.append("FULL_ADDRESS", this.myFromGroup.get("FULL_ADDRESS").value);
    var i = 0;
    this.resourceImages.forEach(fileObj => {
      //console.log(fileObj.name);
      formData.append('file2Upload' + i++, fileObj.file, fileObj.name);
      //gui tung file hoac tat ca cac file
    });
    //gui lenh user/save 
    let loading = this.loadingCtrl.create({
      content: 'Saving user info...'
    });
    loading.present();

    this.apiService.editUser(formData)
      .then(data => {
        loading.dismiss();
        
        this.alertCtrl.create({
          title: 'Save your setting successful!',
          subTitle: 'Welcome to system!',
          buttons: ['OK']
        }).present();
        
        //xoa token
        this.apiStorageService.deleteToken();
        this.apiService.logout()
        .then(data=>{
          
          this.navCtrl.setRoot(LoginPage);
        })
        .catch(err=>{
          console.log(err);
        });

       
      })
      .catch(err => {
        loading.dismiss();
        this.toastCtrl.create({
          message: "result: " + JSON.stringify(err),
          duration: 5000,
          position: 'bottom'
        }).present();
      }
      );

  }
}
