const router = require("express").Router();
const Transaction = require("../models/transaction.js");

router.post("/transaction", ({body}, res) => {
  Transaction.create(body)
    .then(dbTransaction => {
      res.status(200).json(dbTransaction);
    })
    .catch(err => {
      res.status(500).json(err);
    });
});

router.post("/transaction/bulk", ({body}, res) => {
  Transaction.insertMany(body)
    .then(dbTransaction => {
      res.status(200).json(dbTransaction);
    })
    .catch(err => {
      res.status(500).json(err);
    });
});

router.get("/transaction", (req, res) => {
  Transaction.find({}).sort({date: -1})
    .then(dbTransaction => {
      const validatedTransaction = Array.isArray(dbTransaction) ? dbTransaction : [];
      res.status(200).json(validatedTransaction);
    })
    .catch(err => {
      res.status(500).json(err);
    });
});


module.exports = router;