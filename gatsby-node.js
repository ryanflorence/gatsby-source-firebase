const firebase = require("firebase-admin")
const crypto = require("crypto")

exports.sourceNodes = (
  { actions },
  { credential, databaseURL, types, quiet = false },
  done
) => {
  const { createNode } = actions

  firebase.initializeApp({
    credential: firebase.credential.cert(credential),
    databaseURL: databaseURL
  })

  const db = firebase.database()

  const start = Date.now()

  types.forEach(
    ({ query = ref => ref, map = node => node, type, path }) => {
      if (!quiet) {
        console.log(`\n[Firebase Source] Fetching data for ${type}...`)
      }

      query(db.ref(path)).once("value", snapshot => {
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
        done()
      })
    },
    error => {
      throw new Error(error)
    }
  )
}
