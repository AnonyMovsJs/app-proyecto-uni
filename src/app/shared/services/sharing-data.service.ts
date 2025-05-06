import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharingDataService {

  private _openCloseEventEmitter = new EventEmitter;

  get openCloseEventEmitter() {
    return this._openCloseEventEmitter;
  }
}
