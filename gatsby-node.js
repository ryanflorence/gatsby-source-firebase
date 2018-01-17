const firebase = require("firebase-admin")
const crypto = require("crypto")

exports.sourceNodes = async (
  { boundActionCreators },
  { credential, databaseURL, types, quiet = false }
) => {
  const { createNode } = boundActionCreators

  firebase.initializeApp({
    credential: firebase.credential.cert(credential),
    databaseURL: databaseURL
  })

  const db = firebase.database()

  const start = Date.now()

  const promises = types.map(
    ({ query = ref => ref, map = node => node, type, path }) => {
      if (!quiet) {
        console.log(`\n[Firebase Source] Fetching data for ${type}...`)
      }

      return query(db.ref(path)).once('value').then(snapshot => {
        if (!quiet) {
          console.log(
            `\n[Firebase Source] Data for ${type} loaded in`,
            Date.now() - start,
            "ms"
          )
        }

        const val = snapshot.val()

        Object.keys(val).forEach(key => {
          const node = map(Object.assign({}, val[key]))

          const contentDigest = crypto
            .createHash(`md5`)
            .update(JSON.stringify(node))
            .digest(`hex`)

          createNode(
            Object.assign(node, {
              id: key,
              parent: "root",
              children: [],
              internal: {
                type: type,
                contentDigest: contentDigest
              }
            })
          )
        })
      }, error => {
        throw new Error(error)
      })
    }
  )

  return Promise.all(promises)

}
