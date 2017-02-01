import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import {TranslateService} from 'ng2-translate';

import { MenuPage } from '../../menu/menu'
import { LocationInventoryPage } from '../inventory-location/location-inventory'
import { InventoriesPage } from '../inventories/inventories'


@Component({
  selector: 'page-inventory',
  templateUrl: '../../menu/menu.html'
})
export class InventoryPage extends MenuPage {

  constructor(navCtrl: NavController, translate: TranslateService) {
    super(navCtrl, translate)
    this.title = 'Inventarios'
    /**
     * New menus go here,
     * params = true means we are creating a new inventory.
     * @type {Array}
     */
    this.menu = [
      { name: "Inventories", page: LocationInventoryPage, params: true },
      { name: "Inventory List", page: InventoriesPage, params: false }
    ]
  }
}
