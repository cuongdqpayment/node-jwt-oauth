import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { FormGroup, FormBuilder } from '@angular/forms';
import { ApiService } from '../../services/apiService';
import { HomePage } from '../home/home';

@Component({
  selector: 'page-setting',
  templateUrl: 'setting.html'
})
export class SettingPage {

  public myFromGroup: FormGroup;
  public isImageViewer: boolean = false;
  public resourceImages: { imageViewer: any, file: any, name: string }[] = [];
  public serverKey: any;
  public userInfo: any;

  constructor(public navCtrl: NavController,
    private formBuilder: FormBuilder,
    private apiService: ApiService) { }

  ngOnInit() {
    this.apiService.getServerKey()
      .then(pk => this.serverKey = pk)
      .catch(err => console.log(err));

    this.userInfo = this.apiService.getUserInfoSetting()

    this.myFromGroup = this.formBuilder.group({
        DISPLAY_NAME: (this.userInfo)?this.userInfo.DISPLAY_NAME:'',
        FULL_NAME: (this.userInfo)?this.userInfo.FULL_NAME:'',
        PHONE: (this.userInfo)?this.userInfo.PHONE:'',
        EMAIL: (this.userInfo)?this.userInfo.EMAIL:'',
        FULL_ADDRESS: (this.userInfo)?this.userInfo.FULL_ADDRESS:'',
        fileload: '',
      });
  }

  onSubmit() {
    
    var formData: FormData = new FormData();
    formData.append("Authorization", 'Bearer '+ this.apiService.getUserToken());
    formData.append("DISPLAY_NAME", this.myFromGroup.get("DISPLAY_NAME").value);
    formData.append("FULL_NAME", this.myFromGroup.get("FULL_NAME").value);
    formData.append("PHONE", this.myFromGroup.get("PHONE").value);
    formData.append("EMAIL", this.myFromGroup.get("EMAIL").value);
    formData.append("FULL_ADDRESS", this.myFromGroup.get("FULL_ADDRESS").value);
    var i=0;
    this.resourceImages.forEach(fileObj => {
      //console.log(fileObj.name);
      formData.append('file2Upload'+i++, fileObj.file, fileObj.name);
      //gui tung file hoac tat ca cac file
    });
    //gui lenh login 
    this.apiService.postUserSave(formData)
      .then(data => {
        //let result = data;
        console.log(data)
        //quay tro lai trang chu roi nhe
        this.navCtrl.setRoot(HomePage);
      })
      .catch(err => console.log(err));

  }


  fileChange(event) {

    if (event.target && event.target.files) {
      const files: { [key: string]: File } = event.target.files;
      for (let key in files) { //index, length, item
        if (!isNaN(parseInt(key))) {
          let reader = new FileReader();
          reader.readAsDataURL(files[key]);
          reader.onload = (kq: any) => {
            this.resourceImages.push(
              {
                imageViewer: kq.target.result, //ket qua doc file ra binary
                file: files[key], //doi tuong file goc
                name: files[key].name //ten file upload len
              }
            );
            this.isImageViewer = true;
          }
        }
      }//
    }
  }


  deleteImage(evt) {
    this.resourceImages = this.resourceImages.filter((value, index, arr) => {
      return value != evt;
    });
  }
}
