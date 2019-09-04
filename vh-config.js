/**
 * Apache Virtual Host config generator
 * ====================================
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const shell = require('shelljs')
const parser = require('tree-parser')
const { AutoComplete } = require('enquirer')


const args = process.argv

const version = {
    major: 0,
    minor: 3,
    patch: 0
}

// Options
let options = {
    force: 0,
    restart: 0,
    overwrite: 0,
    php: 72
}

// Names
let projectName = ''

// Paths
const root = "/usr/local/etc/httpd"
const dest = "sites-available"
const clone = "sites-enabled"
const workDir = process.cwd()

const helpText = {
    usage: 'Usage: vh-config [arguments]',
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
                '-r, --restart',
                'restarts brew httpd service'
            ],
            [
                '-v',
                'print vh-config version number'
            ],
            [
                '-x',
                'overwrite existing config file'
            ],
            [
                '-R, --Remove',
                'overwrite existing config file'
            ],
            [
                '--php=',
                'specify php version (default is 7.2)'
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
}

/**
 * Delete config
 */
const configDel = (file) => {
    const target = {
        dest: path.join(root, dest, file),
        clone: path.join(root, clone, file),
    }
    // Remove the original config file
    print(
        `Delete: ${chalk.yellow(target.dest)}`
    )

    shell.rm(target.dest)

    // Remove the cloned config file
    print(
        `Delete: ${chalk.yellow(target.clone)}`
    )
    shell.rm(target.clone)
}

// Create symlink
const symLn = (fileName)=> {
    const lnTarget = path.join(root, dest, fileName)
    const lnRef = path.join(root, clone, fileName)

    shell.ln('-s', lnTarget, lnRef)
}

const restartServices = (service) => {
    const brewRestart = 'brew services restart'
    if (service === 'httpd') {
        return `${brewRestart} httpd`
    }
}

/**
 * Remove entry
 */
const remove = () => {
    const prompt = new AutoComplete (
        {
            name: 'Config Remove',
            message: 'Which config file should I remove? (Esc to cancel)',
            choices: listFiles._contents
        }
    )

    prompt.run()
    .then(answer => {
        configDel(answer)
        end()
    })
    .catch(console.error)
}

/**
 * Print help
 */
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

// Write to config files
const configCreate = () => {
    projectValidate()

    // Config template
    const template = `<VirtualHost *:8080>
        DocumentRoot ${workDir}/web
        ServerName ${projectName}.local.blee.ch
        RewriteCond ${workDir}/web/%{REQUEST_FILENAME} -f
        RewriteRule ^/(.*\.php(/.*)?)$ fcgi://127.0.0.1:90${options.php}/${workDir}/web/$1 [P,QSA,L]
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
        RewriteRule ^/(.*\.php(/.*)?)$ fcgi://127.0.0.1:90${options.php}${workDir}/web/$1 [P,QSA,L]
        Include "/usr/local/etc/httpd/ssl/ssl-shared-cert.inc"
        <Directory ${workDir}/web>
            Options -Indexes +FollowSymLinks -MultiViews
            AllowOverride All
            Require all granted
        </Directory>
    </VirtualHost>
    `


    // Write config file to disk
    fs.writeFile(path.join(root, dest, fileName), template, (err) => {
        if (err) throw err

        if (!options.overwrite) {
            symLn(fileName)
        }

        // File written successfully
        console.log(`File named ${chalk.yellow(fileName)} was created.`)

        if (options.restart) {
            // Try to restart services
            print('Sending restart command `httpd`:')
            shell.exec(restartServices('httpd'))
        }
    })
}

/**
 * Validate project
 */
const projectValidate = () => {
    if (!fs.existsSync(path.join(workDir, 'web')) && options.force === 0) {
        print('Current directory doesn\'t seem to be a valid project.')
        print('Please use \'--force\' option to suppress this warning.')
        end()
    } else if (fs.existsSync(path.join(root, dest, fileName)) && !options.overwrite) {
        print(`Looks like the config file (${fileName}) already exists. Please delete it before trying again or use the '-x' flag.`, 'error')
        end()
    }
}


/**
 * Read arguments
 */
const readArgs = () => {
    if (args.length < 2) {
        print('Looks like something went wrong.', 'error')
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
        // -d, --default
        } else if (args.indexOf('-d') != -1 || args.indexOf('--default') != -1) {
            print(`Target path: ${root}`)
            end()
        // -R, --Remove
        } else if (args.indexOf('-R') != -1 || args.indexOf('--Remove') != -1) {
            remove()
        } else {
            // -f, --force
            if (args.indexOf('-f') != -1 || args.indexOf('--force') != -1) {
                options.force = 1
            }
            // -r, --restart
            if (args.indexOf('-r') != -1 || args.indexOf('--restart') != -1) {
                options.restart = 1
            }
            // -x
            if (args.indexOf('-x') != -1) {
                options.overwrite = 1
            }
            // --php=
            args.forEach((arg) => {
                if (arg.search(/--php=.{2,3}/g) > -1) {
                    options.php = arg.match(/\d/g).join('')
                }
            })

            configCreate()
        }
    }
}

/**
 * Check environment
 */
 const scan = () => {
    if (!fs.existsSync(root)) {
        print(`${root} path not found`, 'error')
        end()
    } else {
        readArgs()
    }
}

// MAIN
const listFiles = parser(path.join(root, dest), [/*file exceptions*/])
const pathNodes = workDir.split('/')
projectName = pathNodes[pathNodes.length - 1]

// Output file name
const fileName = `${projectName}.conf`

scan()
// MAIN ./end
