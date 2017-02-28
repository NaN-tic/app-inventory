import { Component, ViewChild, Input, AfterViewInit } from '@angular/core';
import { NavController, NavParams, Events } from 'ionic-angular';
import { InfiniteList } from '../../infinite-list/infinite-list'
import { EncodeJSONRead } from '../../json/encode-json-read'
import { TrytonProvider } from '../../providers/tryton-provider'
// Pages
import { InventoryTypePage } from '../inventory-type/inventory-type'
// Interfaces
import { Location } from '../../../models/location'

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
export class LocationInventoryPage extends InfiniteList implements AfterViewInit{

  @Input()
  itemInput: string;
  @ViewChild('focusInput') myInput;
  item: string

  elementInput: boolean = false;

  location: Location;

  blur_element: boolean;

  json_constructor = new EncodeJSONRead();

  constructor(public navCtrl: NavController, public trytond_provider: TrytonProvider,
  		private navParams: NavParams, public events: Events) {
    super(navCtrl, trytond_provider, events)

    console.log("data", navParams.get('params'))
    this.setDefaultValues()
    this.blur_element = true;
    this.elementInput = false;
  }

  ngAfterViewInit() {
    console.log("set input")
    this.myInput.setFocus()
  }
   blurInput(event){
     if (this.blur_element)
        this.myInput.setFocus();
      this.blur_element = false;
   }
   ionViewDidEnter() {
     console.log("Inside view");
     this.blur_element = true;
     this.myInput.setFocus();
   }
   setFocus(event) {
     console.log("Focus set")
   }
  /**
   * Gets called when a location from the list is selected
   * @param {Object} event   Event description
   * @param {Location} item  Location selected
   * @returns                Go to the next page
   */
  itemSelected(event, item) {
    console.log("Item selected", item, "Going to next page", this.navParams.get('param'))
    this.navCtrl.push(InventoryTypePage, { location: item} )
  }

  /**
   * Go to the next stage, check if the entered location is valid
   */
  goForward() {
    console.log("Searching for code", this.itemInput);
    let json_constructor = new EncodeJSONRead();
    let search_domain = "[" + json_constructor.createDomain(
      "rec_name", "=", this.itemInput) + "]"
    let fields = ['name', 'code']
    let method = "stock.location"
    json_constructor.addNode(method, search_domain, fields)
    let json = json_constructor.createJson()

    this.trytond_provider.search(json).subscribe(
      data => {
        console.log("Location exists", data[method], data[method].length, data[method] > 0);
        if (data[method].length > 0) {
          this.location = data[method];
          console.log("LOcation", this.location)

          this.navCtrl.push(InventoryTypePage, { location: this.location[0] });
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
    console.log("INput changed")
    if (this.itemInput){
      this.elementInput = true;
      this.goForward();
    }
    else{
      this.elementInput = false;
      this.setDefaultValues()
    }
  }
  // This does nothing as of now
  // Should get the entries that are similar to the ones the user typed
  liveReload(event) {
    if (!this.itemInput) {
      this.setDefaultValues();
      return;
    }
    console.log("Setting up new live request")
    this.domain = "[" + this.json_constructor.createDomain(
      "rec_name", "ilike", '%'+this.itemInput+'%')+ ', '+
    this.json_constructor.createDomain("type", "=", "storage")+ "]"
    //this.loadData()
  }

  private setDefaultValues() {
    this.method = "stock.location";
    this.domain = "[" + this.json_constructor.createDomain("type",
      "=", "storage") + "]";
    this.fields = ["name", "code"]
    this.loadData();
  }
}
