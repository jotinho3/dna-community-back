import * as admin from 'firebase-admin';
const serviceAccount = require('../../serviceAccountKey.json'); // Adjust the path to your service account key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "dna-community-back.firebasestorage.app",
  projectId: "dna-community-back"
});

const db = admin.firestore();
const storage = admin.storage();
const auth = admin.auth();

db.settings({ ignoreUndefinedProperties: true });


export { admin, db, storage, auth };