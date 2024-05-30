import psList from "ps-list";
import fs from "fs";
import os from "os";

/**
 * Get process working directory
 * 
 * @param {*} pid 
 * @param {*} callback 
 */
export function processDirectory(pid, callback) {
    switch (os.type()) {
        case 'Linux':
            fs.readlink('/proc/' + pid + '/cwd', callback);
            break;
        case 'Darwin':
            exec('lsof -a -d cwd -p ' + pid + ' | tail -1 | awk \'{print $9}\'', callback);
            break;
        default:
            callback('unsupported OS');
            break;
    }
}

/**
 * Get node processes
 * 
 * I can't get the process cwd 😡😡😡😡
 */
export async function nodeProcesses(callback) {
    const pl = await psList();
    const nodeProcessesName = ["node", "nodemon", "ts-node"]
    
    const nodeProcs = pl.filter((process) => nodeProcessesName.includes(process.name));
    
    const processesWithCwd = nodeProcs.map((proc) => {
        processDirectory(proc.pid, (err, res) => {
            if(err) {
                console.log(err);
            } else {
                proc.cwd = res;
            }
        });
        
        return proc;
    });
    
    callback(processesWithCwd);
}

/**
 * Get app name
 */
export function fetchAppName(directory) {
    const packageFile = `${directory}/package.json`;
    
    let packageJson = fs.readFileSync(packageFile);
    let packageJsonData = JSON.parse(packageJson);
    
    const appName = packageJsonData.name;
    
    return appName;
}

/**
 * Get node processes with cwd
 * 
 * The problem with this one is that it gets processes randomly one by one.
 */
export async function randomAccessNodeProcesses(callback) {
    const pl = await psList();
    const nodeProcessesName = ["node", "nodemon", "ts-node"]
    
    const nodeProcs = pl.filter((process) => nodeProcessesName.includes(process.name));
    
    nodeProcs.map((proc) => {
        processDirectory(proc.pid, (err, res) => {
            if(err) {
                console.log(err);
                
                return callback(proc);
            } else {
                proc.cwd = res;
                
                // Also fetch app name, this will be very useful for terminating apps in general-frontend
                const appName = fetchAppName(proc.cwd);
                proc.name = appName;
                
                return callback(proc);
            }
        });
    });
}

/**
 * Abstraction of forced await
 * 
 * @param {Array} processes Array of processes retrieved with ps-list packages(or if they have 'pid' property, then it'll work too) 
 * @param {function} callback The callback to send all processes when retrieved
 */
export function forcedAwaitCwdRetrieval(processes, callback) {
    // We will wait until we retrieve all processes and then call the user given callback
    let updatedProcesses = [];
    const awaitCallback = (proc) => {
        updatedProcesses.push(proc);
        
        // Check if we've got em' all
        // Gotta catch em' all!
        if(updatedProcesses.length === processes.length) {
            // Alright send em' back!
            return callback(updatedProcesses);
        }
    }
    
    processes.map((proc) => {
        processDirectory(proc.pid, (err, res) => {
            if(err) {
                console.log(err);
                
                return awaitCallback(proc);
            } else {
                proc.cwd = res;
                
                // Also fetch app name, this will be very useful for terminating apps in general-frontend
                const appName = fetchAppName(proc.cwd);
                proc.name = appName;
                
                return awaitCallback(proc);
            }
        });
    });
}

/**
 * Get node processes with cwd forced await
 * 
 */
export async function nodeProcessesForcedAwait(callback) {
    const pl = await psList();
    const nodeProcessesName = ["node", "nodemon", "ts-node"]
    
    const nodeProcs = pl.filter((process) => nodeProcessesName.includes(process.name));
    
    // Force the await of all processes retrieval
    forcedAwaitCwdRetrieval(nodeProcs, callback);
}

/**
 * Shell processses
 */
async function shellProcesses() {
    const pl = await psList();
    const nodeProcs = pl.filter((process) => process.name === "sh");
    console.log(`Shell processes: `, nodeProcs);
}

(async () => {
    console.log(`Shell processes`);
    
    // Shell processses
    await shellProcesses();
    
    console.log(`\nNode processses`);
    
    await nodeProcessesForcedAwait((procs) => {
        console.log(`Node processes: `, procs);
    })
})();
