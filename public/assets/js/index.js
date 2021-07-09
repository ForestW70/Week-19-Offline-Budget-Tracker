// ** courtesy of 2U ** //

let transactions = [];
let myChart;


// const request = window.indexedDB.open("toDoList", 1);

// Create schema
// request.onupgradeneeded = event => {
//   const db = event.target.result;

//   // Creates an object store with a listID keypath that can be used to query on.
//   const toDoListStore = db.createObjectStore("toDoList", { keyPath: "listID" });
//   // Creates a statusIndex that we can query on.
//   toDoListStore.createIndex("statusIndex", "status");

// }





let myitem = {
  name: "forest",
  age: 500,
  gum: "yes"
}


const reqDB = window.indexedDB.open("offlineBugetList", 5);

reqDB.onupgradeneeded = event => {
  const db = event.target.result;
  const offlineStore = db.createObjectStore("offlineList", { keyPath: "offlineID", autoIncrement: true });
  // offlineStore.createIndex("entryIndex", "entry");
}

reqDB.onerror = () => {
  console.log("Error", reqDB.error);
};

reqDB.onsuccess = () => {
  const db = reqDB.result;
  const transact = db.transaction(["offlineList"], "readwrite");
  const addEntryReq = transact.objectStore("offlineList");
}

const saveRecord = (offlineTransaction) => {
  const db = reqDB.result;
  const transaction = db.transaction(["offlineList"], "readwrite");
  const offlineStore = transaction.objectStore("offlineList");
  const request = offlineStore.add(offlineTransaction)

  request.onsuccess = () => console.log("entry added to the store", request.result);
  request.onerror = () => console.log("Error", request.error)

}

function checkDatabase() {
  console.log('checking..');
  const db = reqDB.result;
  // Open a transaction on your BudgetStore db
  let transaction = db.transaction(["offlineList"], "readwrite");

  // access your BudgetStore object
  const offlineStore = transaction.objectStore('offlineList');

  // Get all records from offlineStore and set to a variable
  const getAll = offlineStore.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items in the store, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to BudgetStore with the ability to read and write
            let notherTransaction = db.transaction(["offlineList"], "readwrite");

            // Assign the current store to a variable
            const offlineStore = notherTransaction.objectStore('offlineList');

            // Clear existing entries because our bulk add was successful
            offlineStore.clear();
            console.log('Offline cached.');
          }
        }).catch(err => console.log(err))
    }
  };
}



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
        label: "Total Over Time",
        fill: true,
        backgroundColor: "#6666ff",
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
      // fetch failed, so save in indexed db
      saveRecord(transaction);


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

window.addEventListener('online', checkDatabase);



