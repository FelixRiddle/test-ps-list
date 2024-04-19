import psList from "ps-list";

/**
 * Get node processes
 */
async function nodeProcesses() {
    const pl = await psList();
    const nodeProcs = pl.filter((process) => process.name === "node");
    console.log(`Node processes: `, nodeProcs);
}

console.log(`Showing node processses`);
nodeProcesses();
