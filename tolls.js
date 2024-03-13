// script to import transactions from the ExpressTolls website into Actual (in TSV format)

require('dotenv').config()
let api = require('@actual-app/api');
const fs = require('fs')
var prompt = require('prompt-sync')();

const ACTUAL_URL = process.env.ACTUAL_URL;
const ACTUAL_PASSWORD = process.env.ACTUAL_PASSWORD;
const BUDGET_ID = process.env.BUDGET_ID;
const MEMO = process.env.TOLL_MEMO;
const ACCOUNT_NAME = process.env.TOLL_ACCOUNT_NAME;
const TOLL_TSV = process.env.TOLL_TSV;
const CATEGORY_NAME = process.env.TOLL_CATEGORY_NAME;

if (MEMO === '' | MEMO === undefined) {
    MEMO = prompt('What memo should be used? ');
}

var content = fs.readFileSync(TOLL_TSV, "utf8");
const data = content.split('\n')
    .map(profile => {
        const [trans_num, dt_str, location, status, amount_str] = profile.split('\t');
        let dt = new Date(dt_str.split(' ')[0]);
        let isostring = dt.toISOString();
        let date = isostring.substring(0, isostring.indexOf('T'));
        let amount = -1 * parseInt(parseFloat(amount_str.replace('$', '')) * 100)
        let payee_name = location.split(' ')[0];
        if (location.includes('E470')) payee_name = "E470";
        if (location.includes('NWP')) payee_name = "Northwest Parkway";
        if (location.includes('US36')) payee_name = "US36 Toll Lane";
        let notes = `${MEMO} - ${dt_str} ${location} ${status} - ${trans_num}`
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