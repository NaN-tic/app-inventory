import { Component, Input } from '@angular/core';
import { Locker } from 'angular-safeguard';
import { NavController, NavParams } from 'ionic-angular';
import { EncodeJSONRead } from '../../json/encode-json-read'
import { EncodeJSONWrite } from '../../json/encode-json-write'
import { TrytonProvider } from '../../providers/tryton-provider'

import { Products } from '../../../models/interfaces/products'
import { Inventory, InventoryLines } from '../../../models/interfaces/inventory'

/*
  Generated class for the InventoryList page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-inventory-list',
  templateUrl: 'inventory-list.html'
})
export class InventoryListPage {

  @Input()
  itemInput: string;
  /**
   * Items to display
   * @type {InventoryLines[]}
   */
  item_array: InventoryLines[] = [];

  product: Products;
  location: Location;
  inventory: Inventory;
  inventory_line: InventoryLines;

  local_storage = this.locker.useDriver(Locker.DRIVERS.LOCAL)

  elementInput: boolean = false;
  new_inventory: boolean = true;

  constructor(public navCtrl: NavController, public navParams: NavParams,
    public trytonProvider: TrytonProvider, public locker: Locker) {

    // Get location
    this.location = navParams.get('location');
    this.new_inventory = navParams.get('params')
    console.log("Location", this.location, " New", this.new_inventory)

    if (!this.new_inventory) {
      this.inventory = navParams.get('inventory')
      this.fetchInventoryData(this.location, this.inventory)
    }
    else {
      let current_date = new Date()
      console.log("Current date", current_date);

      this.inventory = {
        company_id: this.local_storage.get('UserData')[0].company_id,
        date: this.format_date(current_date),
        location: navParams.get('location'),
        id: -1,
        lines: []
      }
      console.log("Creating new inventory", this.inventory)
    }
  }

  /**
   * Fetchs the data from the selected inventory
   * @param {Location}  location  Information about the location
   * @param {Inventory} inventory The inventory information
   */
  fetchInventoryData(location: Location, inventory: Inventory) {
    let json_constructor = new EncodeJSONRead;
    let method = "stock.inventory.line";
    let fields = ["product.name", "product.rec_name", "product.codes.number",
      "product.id", "quantity", "expected_quantity"];
    let domain = "[" + json_constructor.createDomain(
      "inventory", "=", inventory.id) + "]";

    json_constructor.addNode(method, domain, fields);
    let json = json_constructor.createJson();

    this.trytonProvider.search(json).subscribe(
      data => {
        console.log("Got data", data);

        for (let line of data[method]) {
          this.product = {
            name: line.product_name,
            codes_number: line.product_codes_number,
            rec_name: line.rec_name,
            id: line.product_id
          }
          this.inventory_line = {
            product: this.product,
            quantity: line.quantity,
            expected_quantity: line.expected_quantity,
            id: line.id
          }
          this.item_array.push(this.inventory_line)
          this.inventory.lines = this.item_array;
        }
        console.log("Fetched data", this.inventory);
      },
      error => {
        console.log("A wild error was found", error);
      })
  }

	/**
     * Listener for an input event. Sets the done button enabled or disabled
     * @param {Object} event Event description
     */
  inputChange(event) {
    console.log("Dected a change on the input", this.itemInput);
    if (this.itemInput) {
      for (let line of this.item_array) {
        if (line.product.codes_number == this.itemInput) {
          line.quantity += 1;
          this.itemInput = '';
          return;
        }
      }
      this.getProduct(this.itemInput)
    }
  }

  /**
   * Gets the data from the given product barcode
   * @param {string} barcode Bar code number of a product
   */
  getProduct(barcode: string) {

    let json_constructor = new EncodeJSONRead;
    let method = "product.product";
    let fields = ["name", "codes.number", "rec_name"];
    let domain = "[" + json_constructor.createDomain(
      'rec_name', '=', barcode) + "]";

    json_constructor.addNode(method, domain, fields);
    let json = json_constructor.createJson();
    this.trytonProvider.search(json).subscribe(
      data => {
        console.log("Got product", data);
        if (data[method].length == 0) {
          alert("The product does not exists")
          return;
        }
        this.product = data[method][0];
        this.inventory_line = {
          product: this.product,
          quantity: 1,
          id: -1
        };
        this.item_array.push(this.inventory_line);
        this.inventory.lines.push(this.inventory_line);
        console.log("Updated inventory lines", this.inventory.lines)
        this.itemInput = "";
      },
      error => {
        console.log("Error", error);
        alert("The product does not exist")
      });
  }

  /**
   * Sets the date to a format that tryton understands
   * @param  {date object} date  object containing the full initial and final date
   * @return {date object} contains the new date in a format that trytond udersantds
   *                       YYYY-MM-DD HH:mm:ss
   */
  private format_date(date) {

    let start_year = date.getUTCFullYear();
    let start_month = date.getUTCMonth() + 1;
    let start_day = date.getUTCDate();
    return start_year + '-' + this.pad_with_zeroes(start_month, 2) + '-' +
      this.pad_with_zeroes(start_day, 2)
  }

  /**
   * Adds as many '0' at the begining of the string 'number'
   * as the value of 'length'
   * @param  {string} $'8'  String of numbers
   * @param  {int}    $2    Length of the new string
   * @return {string} $'08'
   */
  private pad_with_zeroes(number, length) {
    let my_string = '' + number;
    while (my_string.length < length) {
      my_string = '0' + my_string;
    }
    return my_string;
  }

  /**
   * Saves the current inventory into tryton
   */
  save() {
    if (this.new_inventory == false) {
      this.update()
      return;
    }
    console.log("Sving");
    let json_constructor = new EncodeJSONWrite;
    let method = "stock.inventory";
    let id = this.inventory.id;
    let values = {
      company: this.inventory.company_id,
      location: this.inventory.location.id,
      date: this.inventory.date
    }
    json_constructor.addNode(method, [id, values])
    let json = json_constructor.createJSON()

    this.trytonProvider.write(json).subscribe(
      data => {
        let json_lines = new EncodeJSONWrite;
        let inventory_line = "stock.inventory.line"

        for (let line of this.inventory.lines) {
          id = line.id;
          let values = {
            inventory: data[method][0],
            product: line.product.id,
            quantity: line.quantity,
          }
          json_lines.addNode(inventory_line, [id, values])
        }
        let lines = json_lines.createJSON()
        this.trytonProvider.write(lines).subscribe(
          data => {
            console.log("Created succesfuly", data)
            this.navCtrl.pop();
          })
      })

  }

  /**
   * Updates the current inventory with the new values
   */
  update() {
    let json_lines = new EncodeJSONWrite;
    let inventory_line = "stock.inventory.line"

    for (let line of this.inventory.lines) {
      let id = line.id;
      let values = {
        inventory: this.inventory.id,
        product: line.product.id,
        quantity: line.quantity,
      }
      json_lines.addNode(inventory_line, [id, values])
    }
    let lines = json_lines.createJSON()
    this.trytonProvider.write(lines).subscribe(
      data => {
        console.log("Update successful", data)
        this.navCtrl.pop();
      })
  }
}
