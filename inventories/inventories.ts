import { Component } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Locker } from 'angular-safeguard';

import { InfiniteList } from '../../infinite-list/infinite-list'
import { EncodeJSONRead } from '../../models/json/encode-json-read'
import { TrytonProvider } from '../../providers/tryton-provider'
import { Inventory } from '../../../models/interfaces/inventory'
import { Location } from '../../../models/interfaces/location'

import { InventoryListPage } from '../inventory-list/inventory-list'

/*
  Generated class for the Inventories page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-inventories',
  templateUrl: 'inventories.html'
})

/**
 * Thsi component controlls the list of already created inventories
 */
export class InventoriesPage extends InfiniteList{

	inventory: Inventory;
	location: Location;

	title: string;

	local_storage = this.locker.useDriver(Locker.DRIVERS.LOCAL)


    constructor(public navCtrl: NavController, public trytond_provider: TrytonProvider,
    	private navParams: NavParams, public locker: Locker) {
  		super(navCtrl, trytond_provider)
  		this.title = "Inventarios";
  		this.method = "stock.inventory";

  		// TODO: might need to change and look for location
        this.domain = "[" + new EncodeJSONRead().createDomain("state",
            "=", "draft") + "]";
        this.fields = ["date", "company.id", "location.name", "location.code",
        "location.parent.name", "location.id"];
        this.loadData()
  	}

  	/**
 	 * Gets called when a location from the list is selected
  	 * @param {Object} event   Event description
 	 * @param {Location} item  Location selected
 	 * @returns                Go to the next page
 	 */
	itemSelected(event, item){
    	console.log("Item selected", item, "Going to next page", this.navParams.get('param'))

    	this.location = {
    		name: item.location_name,
    		code: item.location_code,
    		parent_name: item.location_parent_name,
    		id: item.location_id
    	}
    	this.inventory = {
    		company_id: item.company_id,
    		date: item.date,
    		location: this.location,
    		id: item.id
    	}
    	console.log("Item selected", item)
    	console.log("Creating location and inventory", this.location, this.inventory)
    	this.navCtrl.push(InventoryListPage,
    		{
    			location: this.location,
    			params: false,
    			inventory: this.inventory
    		})
	}

}
