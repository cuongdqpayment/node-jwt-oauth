import { Inject, Injectable } from '@angular/core';
import { LOCAL_STORAGE, StorageService, isStorageAvailable } from 'angular-webstorage-service';
 
const STORAGE_KEY = 'Cng@3500888';
const sessionStorageAvailable = isStorageAvailable(sessionStorage); 

@Injectable()
export class ApiStorageService {
 
    constructor(@Inject(LOCAL_STORAGE) private storage: StorageService) {
    }
 
    public doSomethingAwesome(): number {
        const awesomenessLevel: number = this.storage.get(STORAGE_KEY) || 1337;
        this.storage.set(STORAGE_KEY, awesomenessLevel + 1);
        return awesomenessLevel;
    }

    save(key,value){
        this.storage.set(key, value);
    }
    read(key){
        return this.storage.get(key);
    }

    delete(key){
        this.storage.remove(key);
    }

    getStatus(){
        return `Session storage available: ${sessionStorageAvailable}`;
    }

    saveToken(value){
        this.save('token',value);
    }

    getToken(){
       return this.read('token');
    }

    deleteToken(){
        this.delete('token');
    }

}