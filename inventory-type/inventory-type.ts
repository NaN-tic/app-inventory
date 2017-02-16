import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import {TranslateService} from 'ng2-translate';

import { MenuPage } from '../../menu/menu'
import { InventoryListPage } from '../inventory-list/inventory-list'


@Component({
  selector: 'page-inventory-type',
  templateUrl: '../../menu/menu.html'
})
/**
 * This class creates the main menu for the inventories.
 * The user can choose between creating a new inventory or looking at one
 * already created
 */
export class InventoryTypePage extends MenuPage {

  constructor(navCtrl: NavController, translate: TranslateService,
    private navParams: NavParams) {

    super(navCtrl, translate)
    this.title = 'Inventory Type'
    /**
     * New menus go here,
     * params = true means we are creating a new inventory.
     * @type {Array}
     */
    let location = navParams.get('location')
    console.log("Location", location)
    this.menu = [
      { name: "Products Inventory",
        page: InventoryListPage,
        params: {location:location, new_inventory: true, products_inventory: true}
      },
      {
        name: "Complete Inventory",
        page: InventoryListPage,
        params: {location:location, new_inventory:true, products_inventory: false}
      }
    ]
  }
}
