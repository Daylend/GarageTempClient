load('api_config.js');
load('api_dash.js');
load('api_events.js');
load('api_gpio.js');
load('api_shadow.js');
load('api_timer.js');
load('api_sys.js');
load('api_dht.js');

let state = {avgTemp: 30, uptime: 0};  // Device state
let online = false;  
let dhtpin = Cfg.get('app.dht.pin');                             // Connected to the cloud?
let dht = DHT.create(dhtpin, DHT.DHT22);

let reportState = function() {
  Shadow.update(0, state);
};

let updateTemp = function() {
  let newTemp = dht.getTemp();

  // Make sure the temperature readings are "realistic"
  if (!isNaN(newTemp) && newTemp > -50 && newTemp < 50)
  {
    // Slow down the average so it takes awhile to reach high/low numbers
    let newAvgTemp = ((state.avgTemp * 10) + newTemp) / 11;
    // Make sure avg temp is also "realistic"
    if (newAvgTemp > -50 && newAvgTemp < 50)
    {
      state.avgTemp = newAvgTemp;
    }
  }
  else
  {
    print('Invalid temperature reading:', newtemp);
  }
};

// Update state every second, and report to cloud if online
Timer.set(5000, Timer.REPEAT, function() {
  state.uptime = Sys.uptime();
  state.ram_free = Sys.free_ram();
  print('online:', online, JSON.stringify(state));
  updateTemp();

  if (online) reportState();
}, null);

// Set up Shadow handler to synchronise device state with the shadow state
Shadow.addHandler(function(event, obj) {
  if (event === 'UPDATE_DELTA') {
    print('GOT DELTA:', JSON.stringify(obj));
    for (let key in obj) {  // Iterate over all keys in delta
      if(key === 'avgTemp')
      {
        state.avgTemp = obj.avgTemp;
      }
    }
    reportState();  // Report our new state, hopefully clearing delta
  }
});

Event.on(Event.CLOUD_CONNECTED, function() {
  online = true;
  Shadow.update(0, {ram_total: Sys.total_ram()});
}, null);

Event.on(Event.CLOUD_DISCONNECTED, function() {
  online = false;
}, null);


// if (btn >= 0) {
//   let btnCount = 0;
//   let btnPull, btnEdge;
//   if (Cfg.get('board.btn1.pull_up') ? GPIO.PULL_UP : GPIO.PULL_DOWN) {
//     btnPull = GPIO.PULL_UP;
//     btnEdge = GPIO.INT_EDGE_NEG;
//   } else {
//     btnPull = GPIO.PULL_DOWN;
//     btnEdge = GPIO.INT_EDGE_POS;
//   }
//   GPIO.set_button_handler(btn, btnPull, btnEdge, 20, function() {
//     state.btnCount++;
//     let message = JSON.stringify(state);
//     let sendMQTT = true;
//     if (Azure.isConnected()) {
//       print('== Sending Azure D2C message:', message);
//       Azure.sendD2CMsg('', message);
//       sendMQTT = false;
//     }
//     if (Dash.isConnected()) {
//       print('== Click!');
//       // TODO: Maybe do something else?
//       sendMQTT = false;
//     }
//   }, null);
// }