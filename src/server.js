const express = require('express')
const path = require('path')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  },
})
const multer = require('multer')
const cors = require('cors')

const upload = multer({ dest: './uploads' })
let clients = new Map(),
  notes = new Map(),
  images = new Map()

app.use(cors())
app.use(express.static(path.join(__dirname, '../build')))
app.post('/api/uploadfile', upload.single('image'), function(req, res) {
  res.json({
    success: true,
    filename: req.file.filename,
  })
})
app.get('/api/image/:file', function(req, res) {
  res.sendFile(path.join(__dirname, '../uploads/', req.params.file))
})
io.on('connection', (socket) => {
  socket
    .on('login', (email) => {
      const myNotes = []
      for (const note of notes.values()) {
        if (note.owner === email) myNotes.push(note)
        else if (note.share === email) {
          let refNote = Object.assign(note, { x: note.xx, y: note.yy })
          myNotes.push(refNote)
        }
      }
      socket.emit('load', {
        users: Array.from(clients.keys()),
        notes: myNotes,
      })
      socket.handshake.email = email
      clients.set(email, socket)
      io.sockets.emit('connected', email)
    })
    .on('disconnect', () => {
      clients.delete(socket.handshake.email)
      io.sockets.emit('disconnected', socket.handshake.email)
    })
    .on('note-save', (note) => {
      let old = notes.get(note.id)
      if (!old) {
        note.owner = socket.handshake.email
        notes.set(note.id, note)
      } else {
        old.text = note.text
        if (old.share) {
          const other = clients.get(
            old.share === socket.handshake.email ? old.owner : old.share
          )
          if (other) other.emit('updated', note.id, note.text)
        }
      }
    })
    .on('note-delete', (id) => {
      let old = notes.get(id)
      if (!old) return
      if (old.owner === socket.handshake.email) {
        if (old.share) {
          const other = clients.get(old.share)
          if (other) other.emit('closed', id)
        }
        notes.delete(id)
      } else {
        old.share = null
        const other = clients.get(old.owner)
        if (other) other.emit('shared', old)
      }
    })
    .on('note-move', (id, x, y) => {
      let note = notes.get(id)
      if (!note) return
      if (note.owner === socket.handshake.email) {
        note.x = x
        note.y = y
      } else {
        note.xx = x
        note.yy = y
      }
    })
    .on('note-share', (id, email) => {
      let note = notes.get(id)
      if (note.owner === socket.handshake.email) {
        if (note.share && note.share !== email) {
          const other = clients.get(note.share)
          if (other) other.emit('closed', note.id)
        }
        note.share = email
        if (email !== null) {
          const other = clients.get(email)
          if (other) other.emit('shared', note)
        }
      }
    })
    .on('note-color', (id, color) => {
      let note = notes.get(id)
      if (note.share) {
        const other = clients.get(note.share)
        if (other) other.emit('color', id, color)
      }
    })
    .on('clear', () => {
      notes.clear()
      images.clear()
    })
})
server.listen(8080, () => {
  console.log('Connected to port 8080')
})
