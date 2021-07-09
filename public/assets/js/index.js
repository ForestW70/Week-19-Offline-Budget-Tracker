
// create open db to create transactions, create variable to handle open requests.
let db;
const reqDB = window.indexedDB.open("offlineBugetList", 5);


// if DB is out of date, reset db variable, create new object store. check for error or sucess.
reqDB.onupgradeneeded = event => {
  db = event.target.result;
  const offlineStore = db.createObjectStore("offlineList", { keyPath: "offlineID", autoIncrement: true });
}
reqDB.onerror = () => {
  console.log("Error", reqDB.error);
};
reqDB.onsuccess = () => {
  db = reqDB.result;
  console.log("connected to indexedDB store");
}


// save record to be used if application is offline.
// set up transaction, link transaction to offline store, then create an add request for passed object.
// handle sucess/error
const saveRecord = (offlineTransaction) => {
  db = reqDB.result;
  const transaction = db.transaction(["offlineList"], "readwrite");
  const offlineStore = transaction.objectStore("offlineList");
  const request = offlineStore.add(offlineTransaction);

  request.onsuccess = () => console.log("entry added to the store", request.result);
  request.onerror = () => console.log("Error", request.error);
}


// function to check database once app returns to online mode.
// set up transaction process to create a getAll request from DB.
function checkDatabase() {
  console.log('checking..');
  db = reqDB.result;
  
  const transaction = db.transaction(["offlineList"], "readwrite");
  const offlineStore = transaction.objectStore('offlineList');
  const getAll = offlineStore.getAll();

  // If the request was successful, check to see if there are any results.
  // if so, fetch post request to api to add all results to db using body.
  getAll.onsuccess = function () {
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
      // if post was sucessful, convert response to json and check if res exists.
      // if res exists, set up second transaction to clear indexedDB. catch err if needed.
        .then((response) => response.json())
        .then((res) => {
          if (res.length !== 0) {
            const transaction2 = db.transaction(["offlineList"], "readwrite");
            const offlineStore = transaction2.objectStore('offlineList');
            offlineStore.clear();
            console.log('Offline cached.');
          }
        }).catch(err => console.log(err));
    }
  };
}

// event handler to look if app returns to online. if so, run checkdb function.
window.addEventListener('online', checkDatabase);



// ------------------------------------//
// ** Following code courtesy of 2U ** //
// ------------------------------------//

let transactions = [];
let myChart;

fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;

    populateTotal();
    populateTable();
    populateChart();
  });

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;

  // spice swap brought to you by Forest Wilson(tm)
  const totalContainer = document.querySelector("#cswap")
  if (total >= 0) {
    totalContainer.classList.remove('negative')
  } else {
    totalContainer.classList.add('negative')
  }
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: "Be responsible, ok?",
        fill: true,
        backgroundColor: "#922e2e",
        data
      }]
    }
  });
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();

  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      if (data.errors) {
        errorEl.textContent = "Missing Information";
      }
      else {
        // clear form
        nameEl.value = "";
        amountEl.value = "";
      }
    })
    .catch(err => {
      saveRecord(transaction);
      console.log("No connection, saved to offline.")

      // clear form
      nameEl.value = "";
      amountEl.value = "";
    });
}

document.querySelector("#add-btn").onclick = function () {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function () {
  sendTransaction(false);
};