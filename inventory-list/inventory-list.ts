import { Component, Input, ViewChild, AfterViewInit, ElementRef, Renderer } from '@angular/core';
import { Locker } from 'angular-safeguard';
import { NavController, NavParams, AlertController,
  Platform, LoadingController, Events } from 'ionic-angular';
import { Keyboard } from 'ionic-native';
import {TranslateService} from 'ng2-translate';

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
export class InventoryListPage implements AfterViewInit {

  @Input()
  itemInput: string;
  @ViewChild('focusInput2') myInput2: ElementRef;
  lastItem: string;
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
  loading: any;
  /**
   * Enables or disables the save button
   * True -> Disabled, False -> Enabled
   * @type {boolean}
   */
  elementInput: boolean = true;
  /**
   * Set to true if we are creating a new inventory
   * @type {boolean}
   */
  new_inventory: boolean = true;
  blur_element: boolean;
  /**
   * Set to true when the inventory has been saved
   * @type {boolean}
   */
  saved: boolean = false;
  not_checking: boolean = true;

  inventory_fields: Array<string> = [];

  constructor(
    public navCtrl: NavController, public navParams: NavParams,
    public trytonProvider: TrytonProvider, public locker: Locker,
    public alertCtrl: AlertController, public platform: Platform,
    public translateService: TranslateService,public rd: Renderer,
    public loadingCtrl: LoadingController, public events: Events) {

    // Get location
    console.log("Params", navParams.data)
    let params = navParams.get('params');
    console.log("loashcdas", params)
    this.new_inventory = params.new_inventory
    this.location = params.location
    console.log("Location", this.location, " New", navParams.data)

    this.blur_element = true;
    this.setDefaultFields();

    if (this.new_inventory.constructor.name != 'Object' &&
        this.new_inventory == false) {
      this.showLoading();
      this.not_checking = false;
      this.saved = true;
      this.inventory = params.inventory
      this.fetchInventoryData(this.location, this.inventory)
    }
    else {
      // Remove preovious view, this will force the stack to to go back
      // to the location-inventory view
      navCtrl.remove(navCtrl.length() - 1)
      let current_date = new Date()
      this.inventory = {
        company: this.local_storage.get('UserData').company,
        date: this.format_date(current_date),
        location: navParams.get('params').location,
        state: "draft",
        id: -1,
        lost_found: 7,
        lines: []
      }
      console.log("Object keys", Object.keys(this.inventory))
      // If the user choosed a complete inventory
      if (!params.products_inventory) {
        console.log("Product inventory", params.products_inventory)
        this.showLoading();
        // Save current inventory
        this.save();
        events.subscribe('Save procedure completed', (eventData) => {
          this.completeLines();
          this.saved = false;
          events.unsubscribe('Save procedure completed');
        })

      }
      console.log("Creating new inventory", this.inventory)
    }
  }
  /**
   * Asks the suer if he/she wants to leave the view
   * @return {Promise<any>} True or false
   */
  ionViewCanLeave(): Promise<any> {
    console.log("Saving", this.saved)
    if (!this.saved) {
      let title_alert: string = null;
      let text_alert: string = null;
      this.translateService.get('Are you sure you want to leave?').subscribe(
        value => {
          title_alert = value
        }
      )
      this.translateService.get('All progress will be lost if you do not save').subscribe(
        value => {
          text_alert = value
        }
      )
      return new Promise((resolve, reject) => {
        let confirm = this.alertCtrl.create({

          title: title_alert,
          message: text_alert,
          enableBackdropDismiss: false,
          buttons: [{
            text: 'OK',
            handler: () => {
              resolve();
            },
          }, {
              text: 'Cancel',
              handler: () => {
                reject();
              }
            }],
        });
        confirm.present();
      })
    }
  }
  ngAfterViewInit() {
    console.log("Ion init", document.getElementById('test'))
    //this.myInput2.focus()
    document.getElementById('test').focus()
    //this.rd.invokeElementMethod(this.myInput2.nativeElement, 'focus')
  }

  /**
   * Fallback if the input loses focus
   */
  blurInputs(event) {

    if (this.blur_element)
        document.getElementById('test').focus()
      //this.rd.invokeElementMethod(this.myInput2.nativeElement, 'focus')
    this.blur_element = false;
  }

  /**
   * Fetchs the data from the selected inventory
   * @param {Location}  location  Information about the location
   * @param {Inventory} inventory The inventory information
   */
  private fetchInventoryData(location: Location, inventory: Inventory) {
    let json_constructor = new EncodeJSONRead;
    let method = "stock.inventory.line";
    let fields = this.inventory_fields;
    let domain = [json_constructor.createDomain(
      "inventory", "=", inventory.id)];

    json_constructor.addNode(method, domain, fields);
    let json = json_constructor.createJson();
    this.inventory.lines = [];
    this.trytonProvider.search(json).subscribe(
      data => {
        console.log("Got data", data);
        let product_ids = [];
        for (let line of data[method]) {
          this.product = {
            name: line['product.name'],
            codes_number: line.product.codes_number,
            rec_name: line.rec_name,
            id: line.product
          }
          product_ids.push(this.product.id)
          this.inventory_line = {
            product: this.product,
            quantity: line.quantity,
            expected_quantity: line.expected_quantity,
            id: line.id
          }
          this.item_array.push(this.inventory_line)
          this.inventory.lines.push(this.inventory_line)
        }
        this.events.publish("Fetch complete")
        this.hideLoading()
        this.search_code(product_ids)
        // Dont kill me pls
        setTimeout(() => {
          //this.myInput2.setFocus()
          document.getElementById('test').focus()
        }, 1000);
        console.log("Fetched data", this.item_array);
      },
      error => {
        console.log("A wild error was found", error);
      })
  }

  public search_code(product_ids){
    let json_constructor = new EncodeJSONRead;
    console.log("Product ids", product_ids)
    let method = "product.code";
    let fields = ["product", "number"];
    let domain = [json_constructor.createDomain(
      "product", "in", product_ids)];

    json_constructor.addNode(method, domain, fields);
    let json = json_constructor.createJson();
    this.trytonProvider.search(json).subscribe(
      data => {
        for (let value of data[method]) {
          let res = this.inventory.lines.filter(product => product.product.id == value.product)
          let res2 = this.item_array.filter(product => product.product.id == value.product)
          if (res !== undefined) {
            res[0].product.codes_number = value.number;
            res2[0].product.codes_number = value.number;
          }
        }
      },
      error => {
        console.log("Error", error)
      })
  }

  /**
   * Listener for an input event. Sets the done button enabled or disabled
   * @param {Object} event Event description
   */
  public inputChange(event): boolean {
    console.log("Dected a change on the input", this.itemInput, Number(this.itemInput));
    if (this.itemInput && Number(this.itemInput) > 100000) {
      console.log("Setting product quantity")
      if (!this.setProductQuantity(this.itemInput, 1)){
          if (!this.getProduct(this.itemInput))
            return false;
        }
    }
    else if (this.itemInput && Number(this.itemInput) < 100000) {
      // Should never show the alert
      if (!this.setProductQuantity(this.lastItem, Number(this.itemInput))){
        alert('No se ha podido encontrar el producto')
        return false;
        }
    }
    //this.myInput2.setFocus()
    document.getElementById('test').focus()
    return true;
  }
  /**
   * Sets the quantity for a given code
   * @param  {string} item_code    Code of the item to look for.
   *                               If the code is smaller than 100000 its considered
   *                               a quantity for the previous product
   * @param  {number} set_quantity Quantity to add or to set
   * @return {boolean}             True if an item was found
   */
  private setProductQuantity(item_code: string, set_quantity: number) {
    console.log("Item array", this.item_array)
    for (let line of this.item_array) {
      console.log("COdes", line.product)
      if (line.product.codes_number == item_code.toString()) {
        if (Number(this.itemInput) > 100000) {
          line.quantity += set_quantity;
          this.lastItem = this.itemInput;
        }
        else
          line.quantity = set_quantity
        // Set element to first position
        let index_array = this.item_array.indexOf(line);
        let index_list = this.inventory.lines.indexOf(line);

        console.log("Deleting element at position", index_list)
        this.item_array.splice(index_array, 1);
        this.inventory.lines.splice(index_list, 1);

        this.item_array.unshift(line);
        this.inventory.lines.unshift(line);

        this.itemInput = '';
        this.elementInput = false;
        this.saved = false;
        return true;
      }
    }
    console.log("COuld not find product")
    return false;
  }
  /**
   * Gets the data from the given product barcode    "8470001508058" 8470001508058
   * @param {string} barcode Bar code number of a product
   */
  public getProduct(barcode: string) {

    let json_constructor = new EncodeJSONRead;
    let method = "product.product";
    let fields = ["name", "rec_name"];
    let domain = [json_constructor.createDomain(
      'rec_name', '=', barcode)];

    json_constructor.addNode(method, domain, fields);
    let json = json_constructor.createJson();
    this.trytonProvider.search(json).subscribe(
      data => {
        console.log("Got product", data);
        if (data[method].length == 0) {
          this.translateService.get('The product does not exists').subscribe(
            value => {
              let alertTitle = value;
              alert(alertTitle);
            }
          )
          return true;
        }
        this.product = data[method][0];
        this.product.codes_number = barcode;
        this.inventory_line = {
          product: this.product,
          quantity: 1,
          id: -1,
        };
        this.item_array.unshift(this.inventory_line);
        this.inventory.lines.unshift(this.inventory_line)
        this.lastItem = this.itemInput;
        this.elementInput = false;
        this.itemInput = "";
        this.saved = false;
      },
      error => {
        console.log("Error", error);
        this.translateService.get('The product does not exists').subscribe(
          value => {
            let alertTitle = value;
            alert(alertTitle);
          }
        )
        this.itemInput = "";
      });
  }

  /**
   * Sets the line quantity to 0
   * @param  {any}    inventory_line Clicked line
   * @return {Null}                  No return
   */
  public setLineZero(inventory_line: any, index) {
    this.item_array[index].quantity = 0;
    this.saved = false;
    this.elementInput = false;
  }

    public setDefaultFields(){
        this.inventory_fields = ["product.name", "product.rec_name", "product.codes",
          "product", "quantity", "expected_quantity"];
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
   * Shows a loading component on top of the view
   */
  private showLoading() {
    console.log("Showing loading")
    let loading_text;
    this.translateService.get('Loading').subscribe(
      value => {
        loading_text = value
      }
    )
    this.loading = this.loadingCtrl.create({
      content: loading_text
    })
    this.loading.present()
  }

  /**
   * Hides the current loading component on the screen
   */
  private hideLoading() {
    console.log("Dismissing loading")
    this.loading.dismiss();
    // Send event to cancel timeout
    this.events.publish("Loading done")
    //this.myInput2.setFocus();
  }

  /**
   * Calls complete lines method in tryton. This method will complete
   * the inventory with the necessary data
   * @param  {string = 'True'}   fill   If set to true the server will create
   *                                    new lines, if set to false it will not
   *                                    create them, but will calculate them
   * @return {boolean}                  True if succesful
   */
  private completeLines(fill: number = 1): Promise<boolean> {
    console.log("Starting complete lines procedure");
    console.log("Settings:", this.inventory, fill);
    return new Promise((resolve, reject) => {
      this.trytonProvider.rpc_call('model.stock.inventory.complete_lines',
        [[this.inventory.id], fill]).subscribe(
        data => {
          if (fill) {
            this.fetchInventoryData(this.location, this.inventory);
            this.elementInput = false;
            // Set amounts to 0
            this.events.subscribe('Fetch complete', (eventData) => {
              this.saved = false;
              for (let line of this.inventory.lines) line.quantity = 0;
              this.events.unsubscribe('Fetch complete')
            })
          }
          resolve(data);
        },
        error => {
          console.log("An error occurred", error)
          reject(error)
        }
        )
    })
  }
  /**
   * Saves the current inventory into tryton.
   * Inventories with no products are not saved
   */
  save() {
    if (this.new_inventory == false) {
      this.update()
      return;
    }

    console.log("Saving");
    let json_constructor = new EncodeJSONWrite;
    let method = "stock.inventory";
    let id = this.inventory.id;
    console.log("Location", this.inventory)

    let values = {
      company: this.inventory.company,
      location: this.inventory.location.id,
      date: this.inventory.date,
      lost_found: this.inventory.lost_found
    }
    json_constructor.addNode(method, [id, values])
    let json = json_constructor.createJSON()
    console.log(values)
    this.trytonProvider.write(json).subscribe(
      data => {
        console.log("Inventory saved succesfuly!", data)
        this.inventory.id = data[method][0];
        let json_lines = new EncodeJSONWrite;
        let inventory_line = "stock.inventory.line"
        for (let line of this.inventory.lines) {
          id = line.id;
          console.log("Line", line)
          let values = {
            inventory: data[method][0],
            product: line.product.id,
            quantity: line.quantity,
          }
          json_lines.addNode(inventory_line, [id, values])
        }
        console.log(inventory_line)
        let lines = json_lines.createJSON()
        this.trytonProvider.write(lines).subscribe(
          data => {
            console.log("Inventory lines saved succesfuly!")
            this.saved = true;
            this.new_inventory = false;
            this.events.publish("Save procedure completed")
            return true;
          },
          error => {
            console.log("Error", error);
            alert(error.messages[0])
          })

      },
      error => {
        console.log("Error", error);
        alert(error.messages[0])
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
        this.saved = true;
        console.log("Update successful", data)
        alert('Inventario actualizado')
      },
      error => {
        console.log("Error", error);
        alert(error.messages[0])
      })
  }
  /**
   * Confirms the current inventory.
   * @return {null}
   */
  confirm() {
    let json_constructor = new EncodeJSONWrite;
    let method = "stock.inventory"
    let id = this.inventory.id;
    // TODO: This is going to be removed later on
    this.completeLines(0).then((data) => {
      this.trytonProvider.rpc_call("model.stock.inventory.confirm",
        [[id]]).subscribe(
        data => {
          console.log("Confirm successful");
          this.navCtrl.pop();
        },
        error => {
          console.log("An error occurred", error)
          // Show an alert when an error occurs
          // TODO: Add this as a global function
          let error_alert;
          this.translateService.get('Generic_Error').subscribe(
            value => {
              error_alert = value
            }
          );
          alert(error_alert)
        })
    });
  }

  /**
   * Creats an object with the values to save
   * @param {any} line Line to save
   */
  private valuesLinesToSave(line: any) {
      let values = {
          inventory: this.inventory.id,
          product: line.product.id,
          quantity: line.quantity,
      }
      return values
  }
}
