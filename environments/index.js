var chalk = require('chalk')
var fs = require('fs')
var path = require('path')

console.log(chalk.cyan('Copying local environments'))

var env_app = process.env.APP_ENV

if (env_app) {
    fs.readFile(path.join(__dirname, `.${env_app}.env`), (err, data) => {
        if (err) throw err

        fs.writeFile('.env', data, (err) => {
            if (err) throw err
            console.log(chalk.green('Environments file copied successfully'))
        })
    })
}