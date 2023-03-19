const path = require('path');
const express = require('express');
const reader = require('xlsx');
const dotenv = require('dotenv');

const db = require('./util/database');

const app = express();
dotenv.config();

console.log(process.env.EXCEL_PATH);

function readDataFromExcel() {
    const file = reader.readFile(path.join(process.env.EXCEL_PATH));
    const data = reader.utils.sheet_to_json(file.Sheets[file.SheetNames[0]]);
    return data;
}

function generateNestedJson(keyArr, obj, val) {
    for (let i = 0; i < keyArr.length; i++) {
        if (i === keyArr.length - 1) {
            obj[keyArr[i]] = val;
        } else {
            obj[keyArr[i]] = obj[keyArr[i]] ? obj[keyArr[i]] : {};
            obj = obj[keyArr[i]];
        }
    }
}

function excelToJson(data) {
    let resultJSON = [];
    const obj = {};
    data.forEach((res) => {
        const keys = Object.keys(res);
        keys.forEach(key => {
            const keyArr = key.split('.');
            if (keyArr.length === 1) {
                obj[key] = res[key];
            } else {
                generateNestedJson(keyArr, obj, res[key]);
            }
        });
        resultJSON.push(JSON.parse(JSON.stringify(obj)));
    });

    console.log("------------Excel to JSON ------------------");
    console.log(resultJSON);
    return resultJSON;
}

function formatData(data) {
    const formatedData = data.map(user => {
        const { name, age, address, ...rest } = user
        return { name: user.name.firstName + ' ' + user.name.lastName, age, address, additional_info: rest }
    });
    return formatedData;
}

function saveUsersToDB(data) {
    const resultData = formatData(data).map(d => Object.values(d));
    console.log(resultData);
    let sql = `INSERT INTO users (name, age, address, additional_info) VALUES (?,?,?,?)`;
    resultData.forEach(rowData => {
        db.execute(sql, rowData).then(res => {
            //any logic
        }).catch(err => {
            console.log(err);
        });
    });
}

function printAgeDistribution(data) {
    const ageGroups = {
        "< 20": 0,
        "20 to 40": 0,
        "40 to 60": 0,
        "> 60": 0
    };

    data.forEach(user => {
        if (user.age < 20) {
            ageGroups["< 20"] = ageGroups["< 20"] + 1;
        } else if (user.age >= 20 && user.age <= 40) {
            ageGroups["20 to 40"] = ageGroups["20 to 40"] + 1;
        } else if (user.age > 40 && user.age <= 60) {
            ageGroups["40 to 60"] = ageGroups["40 to 60"] + 1;
        } else {
            ageGroups["> 60"] = ageGroups["> 60"] + 1;
        }
    });

    console.log("--------------------Print Age-Group ---> Distribution%------------------");
    for (key in ageGroups) {
        console.log(key + ' ---> ' + ageGroups[key] / data.length * 100 + '%');
    }
}

const excelData = readDataFromExcel();
const convertExelToJson = excelToJson(excelData);
saveUsersToDB(convertExelToJson);
printAgeDistribution(convertExelToJson);

app.listen(3000);