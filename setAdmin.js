import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// GANTI DENGAN UID DARI FIREBASE AUTH → Authentication → Users
const uid = "MASUKKAN_UID_KAMU_DI_SINI";

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => console.log("ADMIN CLAIM SET"))
  .catch(console.error);
