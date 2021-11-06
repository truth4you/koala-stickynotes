import React, { Component } from 'react'
import { render } from 'react-dom'
import Konva from 'konva'
import {
  Stage,
  Layer,
  Rect,
  Text,
  Group,
  Shape,
  Line,
  Image,
} from 'react-konva'
import ImageUploading from 'react-images-upload'
import axios from 'axios'
import io from 'socket.io-client'

const host = 'http://' + window.location.hostname + ':8080'
const socket = io.connect(host)
let activeNote = null,
  loginedEmail = null

class StickyNote extends React.Component {
  state = {
    text: this.props.text,
    color: 'lightyellow',
    width: 200,
    height: 300,
    hover: null,
    share: this.props.share,
  }
  componentDidMount() {
    this.text.fontFamily('monospace')
    this.text.fontSize(12)
    this.applyCache()
    if (this.props.editing) this.handleEdit()
  }
  handleEdit = () => {
    if (this.props.owner !== loginedEmail) return
    const editor = document.createElement('textarea')
    editor.id = 'editor'
    editor.style.left = this.panel.x() + 7 + 'px'
    editor.style.top = this.panel.y() + 90 + 'px'
    editor.style.backgroundColor = this.state.color
    editor.style.fontFamily = this.text.fontFamily()
    editor.style.fontSize = this.text.fontSize()
    editor.value = this.state.text
    document.body.append(editor)
    editor.focus()
    editor.addEventListener('blur', (e) => {
      const text = e.currentTarget.value
      this.setState({ text: text }, () => {
        this.applyCache()
      })
      if (this.panel)
        socket.emit('note-save', {
          id: this.props.id,
          text: text,
          x: this.panel.x(),
          y: this.panel.y(),
          color: this.state.color,
        })
      e.currentTarget.remove()
    })
    editor.addEventListener('input', (e) => {
      const text = e.currentTarget.value
      if (this.panel)
        socket.emit('note-save', {
          id: this.props.id,
          text: text,
          x: this.panel.x(),
          y: this.panel.y(),
          color: this.state.color,
        })
      this.setState({ text: text })
    })
  }
  handleAdd = () => {
    this.props.addNote()
  }
  handleDismiss = () => {
    this.panel.remove()
    socket.emit('note-delete', this.props.id)
  }
  handleSetting = () => {
    this.setState(
      {
        color: Konva.Util.getRandomColor(),
      },
      () => {
        socket.emit('note-color', this.props.id, this.state.color)
        this.applyCache()
      }
    )
  }
  handleHover = (e) => {
    this.setState({ hover: e.target.id() }, () => {
      this.applyCache()
    })
  }
  handleOut = (e) => {
    this.setState({ hover: null }, () => {
      this.applyCache()
    })
  }
  handleDown = () => {
    this.panel.moveToTop()
  }
  handleMove = () => {
    socket.emit('note-move', this.props.id, this.panel.x(), this.panel.y())
  }
  handleShare = (email) => {
    socket.emit('note-share', this.props.id, email)
    this.setState({ share: email })
    this.panel.cache()
  }
  applyCache() {
    this.panel.cache()
  }
  drawButtonAdd = (context, shape) => {
    context.beginPath()
    context.rect(0, 0, 30, 30)
    context.closePath()
    context.fillShape(shape)
    context.beginPath()
    context.moveTo(8, 15)
    context.lineTo(22, 15)
    context.moveTo(15, 8)
    context.lineTo(15, 22)
    context.closePath()
    context.strokeShape(shape)
  }
  drawButtonSetting = (context, shape) => {
    context.beginPath()
    context.rect(0, 0, 30, 30)
    context.closePath()
    context.fillShape(shape)
    context.beginPath()
    context.arc(15, 15, 5, 90, 270)
    context.closePath()
    context.strokeShape(shape)
  }
  drawButtonClose = (context, shape) => {
    context.beginPath()
    context.rect(0, 0, 30, 30)
    context.closePath()
    context.fillShape(shape)
    context.beginPath()
    context.moveTo(10, 10)
    context.lineTo(20, 20)
    context.moveTo(10, 20)
    context.lineTo(20, 10)
    context.closePath()
    context.strokeShape(shape)
  }
  showUsers = () => {
    if (this.props.owner === loginedEmail) {
      activeNote = this
      this.props.activeUser(this.props.share)
      document.getElementById('users').style.display = 'block'
    }
  }
  render() {
    return (
      <Group
        draggable
        x={this.props.x !== undefined ? this.props.x : 0}
        y={this.props.y !== undefined ? this.props.y : 0}
        onDblClick={this.handleEdit}
        ref={(node) => {
          this.panel = node
        }}
        onMouseOver={this.handleHover}
        onMouseOut={this.handleOut}
        onMouseDown={this.handleDown}
        onDragEnd={this.handleMove}
      >
        <Rect
          width={this.state.width}
          height={this.state.height}
          fill={this.state.color}
          shadowBlur={4}
          shadowOffsetX={2}
          shadowOffsetY={2}
          shadowOpacity={0.2}
        />
        <Shape
          id="btnAdd"
          sceneFunc={this.drawButtonAdd}
          width={30}
          height={30}
          fill={this.state.hover === 'btnAdd' ? 'darkgray' : 'transparent'}
          stroke={this.state.hover === 'btnAdd' ? 'white' : 'darkgray'}
          strokeWidth={1}
          onClick={this.handleAdd}
        />
        <Shape
          id="btnSetting"
          visible={this.props.owner === loginedEmail}
          sceneFunc={this.drawButtonSetting}
          width={30}
          height={30}
          x={this.state.width - 60}
          fill={this.state.hover === 'btnSetting' ? 'darkgray' : 'transparent'}
          stroke={this.state.hover === 'btnSetting' ? 'white' : 'darkgray'}
          strokeWidth={2}
          onClick={this.handleSetting}
        />
        <Shape
          id="btnClose"
          sceneFunc={this.drawButtonClose}
          width={30}
          height={30}
          x={this.state.width - 30}
          fill={this.state.hover === 'btnClose' ? 'red' : 'transparent'}
          stroke={this.state.hover === 'btnClose' ? 'white' : 'red'}
          strokeWidth={2}
          onClick={this.handleDismiss}
        />
        <Text
          y={24}
          padding={10}
          width={this.state.width}
          height={this.state.height - 30}
          text={this.state.text}
          ref={(node) => {
            this.text = node
          }}
        />
        <Text
          y={this.state.height - 30}
          padding={10}
          width={this.state.width}
          fill={
            this.state.share || this.props.owner !== loginedEmail
              ? 'red'
              : 'blue'
          }
          cursor="pointer"
          text={
            this.props.owner === loginedEmail
              ? this.state.share
                ? 'Shared with ' + this.state.share
                : 'Not shared'
              : 'Shared from ' + this.props.owner
          }
          ref={(node) => {
            this.share = node
          }}
          onClick={this.showUsers}
        />
      </Group>
    )
  }
}

class URLImage extends React.Component {
  state = {
    image: null,
  }
  componentDidMount() {
    this.loadImage()
  }
  componentWillUnmount() {
    this.image.removeEventListener('load', this.handleLoad)
  }
  loadImage() {
    this.image = new window.Image()
    this.image.src = this.props.src
    this.image.addEventListener('load', this.handleLoad)
  }
  handleLoad = () => {
    this.setState({
      image: this.image,
    })
  }
  render() {
    return (
      <Image
        draggable
        image={this.state.image}
        ref={(node) => {
          this.imageNode = node
        }}
      />
    )
  }
}

class App extends Component {
  constructor(props) {
    super(props)
    this.addNote = this.addNote.bind(this)
    this.clearNotes = this.clearNotes.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.handleColor = this.handleColor.bind(this)
    this.handleUpload = this.handleUpload.bind(this)
    this.handleShare = this.handleShare.bind(this)
    this.handleLogout = this.handleLogout.bind(this)
    if (localStorage.getItem('sticky-user')) {
      loginedEmail = localStorage.getItem('sticky-user')
      this.handleLogin()
    }
  }
  state = {
    notes: [],
    lines: [],
    images: [],
    updated: 0,
    canDrawing: false,
    isDrawing: false,
    color: 'red',
    users: [],
    activeUser: null,
  }
  notes = []
  addNote() {
    // let last = null
    // if (this.state.notes.length > 0)
    //   last = this.state.notes[this.state.notes.length - 1]
    const id = loginedEmail + '-' + Date.now()
    this.state.notes.push({
      id: id,
      text: '',
      owner: loginedEmail,
      editing: true,
    })
    this.setState({
      canDrawing: false,
      updated: this.state.updated + 1,
    })
  }
  clearNotes() {
    this.setState({ canDrawing: false, notes: [], lines: [], images: [] })
    socket.emit('clear')
  }
  handleMouseDown(e) {
    if (!this.state.canDrawing) {
      return
    }
    if (
      e.target.getType() !== 'Stage' &&
      e.target.name() !== 'drawing' &&
      e.target.id() !== 'grid'
    )
      return
    const pos = e.target.getStage().getPointerPosition()
    this.state.lines.push({
      tool: this.state.color == null ? 'eraser' : 'pen',
      points: [pos.x, pos.y],
    })
    this.setState({ isDrawing: true })
  }
  handleMouseMove(e) {
    if (!this.state.canDrawing || !this.state.isDrawing) {
      return
    }
    const stage = e.target.getStage()
    const point = stage.getPointerPosition()
    let lastLine = this.state.lines[this.state.lines.length - 1]
    if (!lastLine) lastLine = { points: [] }
    lastLine.color = this.state.color ? this.state.color : 'black'
    lastLine.points = lastLine.points.concat([point.x, point.y])
    this.state.lines.splice(this.state.lines.length - 1, 1, lastLine)
    this.setState({
      updated: this.state.updated + 1,
    })
  }
  handleMouseUp() {
    this.setState({ isDrawing: false })
  }
  handleColor(e) {
    if (e.target.classList.contains('pen')) {
      this.setState({ color: e.target.getAttribute('color') })
    } else this.setState({ color: null })
  }
  handleUpload(imageList) {
    const formData = new FormData()
    let img = imageList[imageList.length - 1]
    if (img) {
      formData.append('image', img, img.name)
    }
    axios.post(host + '/api/uploadfile', formData).then((res) => {
      if (res.data.success) {
        this.state.images.push({
          src: host + '/api/image/' + res.data.filename,
        })
        this.setState({
          updated: this.state.updated + 1,
        })
      }
    })
  }
  handleLogin() {
    localStorage.setItem('sticky-user', loginedEmail)
    this.setState({
      email: loginedEmail,
    })
    socket.on('connected', (email) => {
      if (email !== loginedEmail) {
        this.state.users.push(email)
        this.setState({
          updated: this.state.updated + 1,
        })
      }
    })
    socket.on('disconnected', (email) => {
      if (email !== loginedEmail) {
        let i = this.state.users.indexOf(email)
        if (i > -1) this.state.users.splice(i, 1)
        this.setState({
          updated: this.state.updated + 1,
        })
      }
    })
    socket.on('shared', (note) => {
      if (note.share) {
        this.state.notes.push(note)
        this.setState({
          updated: this.state.updated + 1,
        })
      } else {
        for (let item of this.state.notes) {
          if (item.id === note.id) {
            item.share = null
            this.notes[item.id].setState({ share: null })
            this.notes[item.id].applyCache()
            break
          }
        }
      }
    })
    socket.on('updated', (id, text) => {
      for (let note of this.state.notes) {
        if (note.id === id) {
          note.text = text
          this.notes[id].setState({ text: text })
          this.notes[id].applyCache()
          break
        }
      }
    })
    socket.on('color', (id, color) => {
      for (let note of this.state.notes) {
        if (note.id === id) {
          this.notes[id].setState({ color: color })
          this.notes[id].applyCache()
          break
        }
      }
    })
    socket.on('closed', (id) => {
      for (const i in this.state.notes) {
        if (this.state.notes[i].id === id) {
          if (activeNote && this.state.notes[i].id === activeNote.id)
            document.getElementById('editor').remove()
          this.state.notes.splice(i, 1)
          this.setState({
            updated: this.state.updated + 1,
          })
          break
        }
      }
    })
    socket.on('load', (data) => {
      this.setState({ users: data.users, notes: data.notes })
    })
    socket.emit('login', loginedEmail)
  }
  handleShare() {
    if (activeNote) {
      activeNote.handleShare(this.state.activeUser)
    }
    document.getElementById('users').style.display = 'none'
  }
  handleLogout() {
    loginedEmail = null
    localStorage.clear()
    this.setState({ email: null })
  }
  closeUsers = () => {
    document.getElementById('users').style.display = 'none'
  }
  activeUser = (user) => {
    this.setState({ activeUser: user })
  }
  render() {
    return (
      <>
        <div className="titlebar">
          <img
            alt="Avatar for Koala"
            src="https://photos.angel.co/startups/i/6539749-eda8798c35450fd82039d3782835d183-medium_jpg.jpg?buster=1608163756"
          />
          <h1>Koala</h1>
          <h3>
            Test Project - Sticky Notes{' '}
            {loginedEmail ? `(${loginedEmail})` : ''}
          </h3>
          {loginedEmail == null ? (
            ''
          ) : (
            <ul>
              <li>
                <span onClick={this.addNote}>
                  <img alt="Add New Note" src="icon-add.png" />
                  Add New
                </span>
              </li>
              <li>
                <span onClick={this.clearNotes}>
                  <img alt="Clear" src="icon-clear.png" />
                  Clear
                </span>
              </li>
              <li className={this.state.canDrawing ? 'checked' : ''}>
                <span
                  onClick={() => {
                    this.setState({ canDrawing: !this.state.canDrawing })
                  }}
                >
                  <img alt="Drawing" src="icon-pen.png" />
                  Drawing
                </span>
                <ul>
                  <li
                    className={`pen ${
                      this.state.color === 'red' ? 'active' : ''
                    }`}
                    onClick={this.handleColor}
                    color="red"
                  ></li>
                  <li
                    className={`pen ${
                      this.state.color === 'orange' ? 'active' : ''
                    }`}
                    onClick={this.handleColor}
                    color="orange"
                  ></li>
                  <li
                    className={`pen ${
                      this.state.color === 'yellow' ? 'active' : ''
                    }`}
                    onClick={this.handleColor}
                    color="yellow"
                  ></li>
                  <li
                    className={`pen ${
                      this.state.color === 'green' ? 'active' : ''
                    }`}
                    onClick={this.handleColor}
                    color="green"
                  ></li>
                  <li
                    className={`pen ${
                      this.state.color === 'blue' ? 'active' : ''
                    }`}
                    onClick={this.handleColor}
                    color="blue"
                  ></li>
                  <li
                    className={`pen ${
                      this.state.color === 'darkblue' ? 'active' : ''
                    }`}
                    onClick={this.handleColor}
                    color="darkblue"
                  ></li>
                  <li
                    className={`pen ${
                      this.state.color === 'purple' ? 'active' : ''
                    }`}
                    onClick={this.handleColor}
                    color="purple"
                  ></li>
                  <li
                    onClick={this.handleColor}
                    className={`erase ${
                      this.state.color === null ? 'active' : ''
                    }`}
                  ></li>
                </ul>
              </li>
              <li>
                <span className="btn-upload">
                  <img alt="Upload" src="icon-upload.png" />
                  Image
                  <ImageUploading
                    withLabel={false}
                    withIcon={false}
                    buttonText=""
                    onChange={this.handleUpload}
                    dataURLKey="data_url"
                  />
                </span>
              </li>
              <li>
                <span onClick={this.handleLogout}>
                  <img alt="Logout" src="icon-logout.png" />
                  Logout
                </span>
              </li>
            </ul>
          )}
        </div>
        {loginedEmail == null ? (
          <div className="login-form">
            <h3>Login Form</h3>
            <label>Email</label>
            <input
              ref={(el) => {
                this.inputEmail = el
              }}
            />
            <button
              onClick={() => {
                loginedEmail = this.inputEmail.value
                this.handleLogin()
              }}
            >
              Login
            </button>
          </div>
        ) : (
          <Stage
            ref={(node) => {
              this.stage = node
            }}
            width={window.innerWidth}
            height={window.innerHeight - 61}
            canDrawing={this.state.canDrawing}
            onMouseDown={this.handleMouseDown}
            onMousemove={this.handleMouseMove}
            onMouseup={this.handleMouseUp}
          >
            <Layer>
              {this.state.lines.map((line, i) => (
                <Line
                  name="drawing"
                  key={i}
                  points={line.points}
                  stroke={line.color}
                  strokeWidth={line.tool === 'eraser' ? 20 : 5}
                  tension={0.5}
                  lineCap="round"
                  globalCompositeOperation={
                    line.tool === 'eraser' ? 'destination-out' : 'source-over'
                  }
                />
              ))}
              <Shape
                id="grid"
                width={window.innerWidth}
                height={window.innerHeight - 61}
                stroke="#EEE"
                strokeWidth={1}
                globalCompositeOperation="destination-over"
                sceneFunc={(context, shape) => {
                  context.beginPath()
                  for (
                    let x = (shape.width() % 50) / 2;
                    x < shape.width();
                    x += 50
                  ) {
                    context.moveTo(x, 0)
                    context.lineTo(x, shape.height())
                  }
                  for (
                    let y = (shape.height() % 50) / 2;
                    y < shape.height();
                    y += 50
                  ) {
                    context.moveTo(0, y)
                    context.lineTo(shape.width(), y)
                  }
                  context.closePath()
                  context.strokeShape(shape)
                }}
              />
              {this.state.images.map((item, key) => (
                <URLImage src={item.src} key={key} />
              ))}
              {this.state.notes.map((item, key) => (
                <StickyNote
                  id={item.id}
                  ref={(el) => {
                    this.notes[item.id] = el
                  }}
                  text={item.text}
                  x={item.x}
                  y={item.y}
                  owner={item.owner}
                  share={item.share}
                  key={key}
                  editing={item.editing}
                  addNote={this.addNote}
                  activeUser={this.activeUser}
                />
              ))}
            </Layer>
          </Stage>
        )}
        <div id="users">
          <div className="users-form">
            <h3>
              Users<button onClick={this.closeUsers}>&times;</button>
            </h3>
            <div>
              <div
                className={this.state.activeUser ? '' : 'active'}
                onClick={() => {
                  this.activeUser(null)
                }}
              >
                None
              </div>
              {this.state.users.map((user, i) => (
                <div
                  key={i}
                  className={this.state.activeUser === user ? 'active' : ''}
                  onClick={() => {
                    this.activeUser(user)
                  }}
                >
                  {user}
                </div>
              ))}
            </div>
            <button onClick={this.handleShare}>Share</button>
          </div>
        </div>
      </>
    )
  }
}

render(<App />, document.getElementById('root'))
