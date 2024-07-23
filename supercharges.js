// script to import transactions from the ExpressTolls website into Actual (in TSV format)

require('dotenv').config()
let api = require('@actual-app/api');
const fs = require('fs')
var prompt = require('prompt-sync')();
const csv_sync = require("csv-parse/sync");

const ACTUAL_URL = process.env.ACTUAL_URL;
const ACTUAL_PASSWORD = process.env.ACTUAL_PASSWORD;
const BUDGET_ID = process.env.BUDGET_ID;
const MEMO = process.env.SUPERCHARGE_MEMO;
const ACCOUNT_NAME = process.env.SUPERCHARGE_ACCOUNT_NAME;
const SUPERCHARGE_CSV = process.env.SUPERCHARGE_CSV;
const CATEGORY_NAME = process.env.SUPERCHARGE_CATEGORY_NAME;


if (MEMO === '' | MEMO === undefined) {
    MEMO = prompt('What memo should be used? ');
}

var content = fs.readFileSync(SUPERCHARGE_CSV, "utf8");
const records = csv_sync.parse(content, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ','
});
const data = records.map(rec => {
    let dt = new Date(rec.ChargeStartDateTime);
    let isostring = dt.toISOString();
    let date = isostring.substring(0, isostring.indexOf('T'));
    let amount = -1 * parseInt(Math.round(parseFloat(rec['Total Inc. VAT']) * 100))
    let payee_name = "Tesla Motors";
    let cost_memo;
    if (rec.QuantityBase != 'N/A') {
        cost_memo = `${parseInt(rec.QuantityBase)} kWh @ ${rec.UnitCostBase}`
    } else {
        memo_list = [];
        if (rec.QuantityTier1 != 'N/A') memo_list.push(`${rec.QuantityTier1} @ ${rec.UnitCostTier1}`)
        if (rec.QuantityTier2 != 'N/A') memo_list.push(`${rec.QuantityTier2} @ ${rec.UnitCostTier2}`)
        if (rec.QuantityTier3 != 'N/A') memo_list.push(`${rec.QuantityTier3} @ ${rec.UnitCostTier3}`)
        if (rec.QuantityTier4 != 'N/A') memo_list.push(`${rec.QuantityTier4} @ ${rec.UnitCostTier4}`)
        cost_memo = memo_list.join('; ')
    }

    let notes = `${MEMO} - ${rec.SiteLocationName} (${cost_memo}) - ${rec.ChargeStartDateTime}`
    return { notes, date, payee_name, amount };
});

(async () => {
    console.log("Initializing API client")
    await api.init({
        // Budget data will be cached locally here, in subdirectories for each file.
        dataDir: '.',
        // This is the URL of your running server
        serverURL: ACTUAL_URL,
        // This is the password you use to log into the server
        password: ACTUAL_PASSWORD,
    });

    await api.downloadBudget(BUDGET_ID);
    let categories = await api.getCategories();
    let category = categories.filter(c => c.name == CATEGORY_NAME)[0].id
    let accounts = await api.getAccounts();
    let account = accounts.filter(a => a.name == ACCOUNT_NAME)[0].id
    const transactions = data.map(d => {
        d.category = category;
        d.account = account;
        return d;
    })
    transactions.forEach((t) => {
        console.log('inserting %o', t);
     }
    )
    await api.importTransactions(account, transactions);
    await api.shutdown();
  })();