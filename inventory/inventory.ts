import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';

import { MenuPage } from '../../models/menu/menu' 
import { LocationInventoryPage } from '../inventory-location/location-inventory'
import { InventoriesPage } from '../inventories/inventories'


@Component({
  selector: 'page-inventory',
  templateUrl: '../../models/menu/menu.html'
})
export class InventoryPage extends MenuPage {

    constructor(navCtrl: NavController) {
    	super(navCtrl)
        this.title = 'Inventarios'
        /**
         * New menus go here, 
         * params = true means we are creating a new inventory.
         * @type {Array}
         */
        this.menu = [
            {name: "Inventarios", page: LocationInventoryPage, params: true},
            {name: "Lista inventarios", page: InventoriesPage, params: false}
        ]    
    }
}
