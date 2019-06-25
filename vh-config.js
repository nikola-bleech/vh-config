#!/usr/bin/env node

/**
 * Apache Virtual Host config generator
 * ====================================
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const shell = require('shelljs')

const args = process.argv

const version = {
    major: 0,
    minor: 1,
    patch: 4
}

// Options
let options = {
    force: 0
}

// Names
let projectName = ''
const nameAppend = '-website'

// Paths
const root = "/usr/local/etc/httpd"
const dest = "sites-available"
const clone = "sites-enabled"
const workDir = process.cwd()

const helpText = {
    usage: 'Usage: vh-config <project name> [arguments]',
    options: {
        title: 'Options:',
        list: [
            [
                '-d, --default',
                'print path to the httpd configuration'
            ],
            [
                '-f, --force',
                'force if project not found in working directory'
            ],
            [
                '-h, --help',
                'print command line options'
            ],
            [
                '-v',
                'print vh-config version number'
            ]
        ]
    }
}

/**
 * Print version number
 */
const printVersion = () => {
    let versionString = ''

    // Check that version number is not empty
    if (version) {
        print(`v${version.major}.${version.minor}.${version.patch}`)
    }

/**
 * Print help
 */
}
const printHelp = () => {
    let argumentsList = []

    print(helpText.usage + '\n')
    print(helpText.options.title)
    // Get the length of the longest argument
    helpText.options.list.forEach(function(item){
        argumentsList.push(item[0])
    })

    // Get max length of the arguments
    const maxArgLen = charMax(argumentsList)

    helpText.options.list.forEach(function(item){
        print(`${item[0]} ${genWhiteSpace(maxArgLen - item[0].length)} ${item[1]}`)
    })
}

/**
 * Generate white space
 */
const genWhiteSpace = (padding) => {
    const seed = ' '
    const result = []

    if (!isNaN(padding)) {
        for (var i = 0; i < padding; i++) {
            result.push(seed)
        }

        return result.join('')
    }
}

/**
 * Get longest word
 */
 const charMax = (strings) => {
    const charLen  = []

    if (Array.isArray(strings)) {
        strings.forEach(function(string){
            charLen.push(string.length)
        })
        return Math.max( ...charLen)
    }
 }

/**
 * Print to console
 */
 const print = (msg, type=null) => {
    if (type === null) {
        console.log(msg)
    } else if (type === 'error') {
        console.error(
            chalk.red(`error: ${msg}`)
        )
    }
}

/**
 * End program
 */
 const end = () => {
    process.exit(1)
}

/**
 * Check environment
 */
 const scan = () => {
    if (!fs.existsSync(root)) {
        print(`${root} path not found`, 'error')
        end()
    }
 }

 scan()

/**
 * Read arguments
 */
if (args.length < 2) {
    print('No arguments provided', 'error')
    print('Usage: vh-config <project name> [arguments]')
    // Kill the process
    end()
} else if (args.length >= 2) {
    // -v
    if (args.indexOf('-v') != -1) {
        printVersion()
        end()
    // -h, --help
    } else if (args.indexOf('-h') != -1 || args.indexOf('--help') != -1) {
        printHelp()
        end()
    // -f, --force
    } else if (args.indexOf('-f') != -1 || args.indexOf('--force') != -1) {
        options.force = 1
    // -d, --default
    } else if (args.indexOf('-d') != -1 || args.indexOf('--default') != -1) {
        print(`Target path: ${root}`)
        end()
    }

    const pathNodes = workDir.split('/')

    projectName = pathNodes[pathNodes.length - 1]
}

// Config template
const template = `<VirtualHost *:8080>
    DocumentRoot ${workDir}/web
    ServerName ${projectName}.local.blee.ch
    RewriteCond ${workDir}/web/%{REQUEST_FILENAME} -f
    RewriteRule ^/(.*\.php(/.*)?)$ fcgi://127.0.0.1:9072/${workDir}/web/$1 [P,QSA,L]
    <Directory ${workDir}/web>
        Options -Indexes +FollowSymLinks -MultiViews
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
<VirtualHost *:8443>
    DocumentRoot ${workDir}/web
    ServerName ${projectName}.local.blee.ch
    RewriteCond ${workDir}/web/%{REQUEST_FILENAME} -f
    RewriteRule ^/(.*\.php(/.*)?)$ fcgi://127.0.0.1:9072${workDir}/web/$1 [P,QSA,L]
    Include "/usr/local/etc/httpd/ssl/ssl-shared-cert.inc"
    <Directory ${workDir}/web>
        Options -Indexes +FollowSymLinks -MultiViews
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
`

// Output file name
const fileName = `${projectName}.conf`

// Create symlink
const symLn = (fileName)=> {
    const lnTarget = path.join(root, dest, fileName)
    const lnRef = path.join(root, clone, fileName)

    shell.ln('-s', lnTarget, lnRef)
}

// Write to config files
const configCreate = () => {
    // Write config file to disk
    fs.writeFile(path.join(root, dest, fileName), template, (err) => {
        if (err) throw err

        symLn(fileName)

        // File written successfully
        console.log(`File named ${chalk.yellow(fileName)} was created.`)
    });
}

if (!fs.existsSync(path.join(workDir, 'web')) && options.force === 0 ) {
    print('Current directory doesn\'t seem to be a valid project.')
    print('Please use \'--force\' option to suppress this warning.')
    end()
} else {
    configCreate()
}
