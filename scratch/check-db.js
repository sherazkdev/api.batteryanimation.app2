const { execFileSync } = require('child_process');
const { MongoClient } = require('mongodb');

function getResolvedUri() {
  const srvUri = "mongodb+srv://sherazkdev_db_user:Testing123@zippytechnologies.mh3maik.mongodb.net/battery-animation-app-api-2";
  const clusterHost = "zippytechnologies.mh3maik.mongodb.net";
  const query = `_mongodb._tcp.${clusterHost}`;
  const output = execFileSync("nslookup", ["-type=SRV", query], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const records = [];
  let pendingPort = 27017;

  for (const line of output.split(/\r?\n/)) {
    const portMatch = line.match(/port\s*=\s*(\d+)/i);
    if (portMatch) {
      pendingPort = Number(portMatch[1]);
      continue;
    }

    const hostMatch = line.match(/svr hostname\s*=\s*(\S+)/i);
    if (hostMatch) {
      records.push({ name: hostMatch[1], port: pendingPort });
    }
  }

  const hostList = records.map((h) => `${h.name}:${h.port}`).join(",");
  return `mongodb://sherazkdev_db_user:Testing123@${hostList}/?ssl=true&authSource=admin`;
}

async function main() {
  try {
    const uri = getResolvedUri();
    const client = new MongoClient(uri);
    await client.connect();
    console.log("Connected successfully!");

    const dbs = ['wallpaper-api-01', 'sounds-api-01', 'animation_api', 'battery-animation-app-api-2'];
    for (const dbName of dbs) {
      const db = client.db(dbName);
      const soundsCount = await db.collection('sounds').countDocuments().catch(() => 0);
      const animationsCount = await db.collection('animations').countDocuments().catch(() => 0);
      console.log(`Database: ${dbName} | sounds count: ${soundsCount} | animations count: ${animationsCount}`);
      if (soundsCount > 0) {
        const doc = await db.collection('sounds').findOne({});
        console.log(` - sounds sample: ${JSON.stringify(doc, null, 2)}`);
      }
      if (animationsCount > 0) {
        const doc = await db.collection('animations').findOne({});
        console.log(` - animations sample: ${JSON.stringify(doc, null, 2)}`);
      }
    }
    
    await client.close();
  } catch (e) {
    console.error(e);
  }
}

main();
