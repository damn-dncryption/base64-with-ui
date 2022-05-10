const { encryptString } = require('string-cipher');

let str = process.argv[2];



encryptString(str, "supersecretdamnshit").then(res => {
    console.log(res);
})

