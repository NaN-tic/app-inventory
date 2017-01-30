import { Component, Input } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { InfiniteList } from '../../models/infinite-list/infinite-list'
import { EncodeJSONRead } from '../../models/json/encode-json-read'
import { TrytonProvider } from '../../providers/tryton-provider'
// Pages
import { InventoryListPage } from '../inventory-list/inventory-list'

// Interfaces
import { Location } from '../../models/location'

@Component({
  selector: 'onChanges',
  templateUrl: 'location-inventory.html'
})
/**
 * This class extends the infinite list class to create a list of the possible
 * locations. Besides choosing a location from the list the user can also
 * write or scan a location and the system will check if the location is 
 * valid or it is not
 */
export class LocationInventoryPage extends InfiniteList {

    @Input() 
    itemInput: string;
    item: string

    elementInput: boolean = false;

    location: Location;

  	constructor(public navCtrl: NavController, public trytond_provider: TrytonProvider,
  		private navParams: NavParams) {
  		  super(navCtrl, trytond_provider)

        console.log("data", navParams.get('params'))
        this.method = "stock.location";

        this.domain = "[" + new EncodeJSONRead().createDomain("type",
            "=", "storage") + "]";
        this.fields = ["name", "code", "parent.name"]
        this.loadData()

        this.elementInput = false;

  	}
    /**
     * Gets called when a location from the list is selected
     * @param {Object} event   Event description
     * @param {Location} item  Location selected
     * @returns                Go to the next page
     */
    itemSelected(event, item){
        console.log("Item selected", item, "Going to next page", this.navParams.get('param'))
        this.navCtrl.push(InventoryListPage, {location: item, params: this.navParams.get('param')})
    }

    /**
     * Go to the next stage, check if the entered location is valid 
     */
    goForward() { 
        console.log("Searching for code", this.itemInput);
        let json_constructor = new EncodeJSONRead();
        let search_domain = "[" + json_constructor.createDomain(
            "code", "=", this.itemInput) + "]"
        let fields = ['name', 'code', 'parent.name']
        let method = "stock.location"
        json_constructor.addNode(method, search_domain, fields)
        let json = json_constructor.createJson()

        this.trytond_provider.search(json).subscribe(
          data => {
            console.log("Location exists", data[method], data[method].length, data[method] > 0);
            if (data[method].length > 0){
              this.location = data[method];
              this.navCtrl.push(InventoryListPage, {location: this.location, params: this.navParams.get('param')})
            }
            else
              alert("Incorrect Location");
          })
        
    }

    /**
     * Listener for an input event. Sets the done button enabled or disabled
     * @param {Object} event Event description
     */
    inputChange(event) {
        if (this.itemInput)
            this.elementInput = true;
        else
            this.elementInput = false;
    }
}
