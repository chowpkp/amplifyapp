import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';





// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

// Set the region 
AWS.config.update({ "accessKeyId": "AKIAJPR5KVL4AAVTNIOQ", "secretAccessKey": "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", "region": "us-east-1" });





const initialFormState = { name: '', description: '' }

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async note => {
      if (note.image) {
        const image = await Storage.get(note.image);
        note.image = image;
      }
      return note;
    }))
    setNotes(apiData.data.listNotes.items);
  }  



  async function emailConfirmation(noteTitle, noteDescription, noteImage) {

      
    // Create sendEmail params 
    var params = {
      Destination: { /* required */
        ToAddresses: [
          'aws.philc@gmail.com',
          /* more items */
        ]
      },
      Message: { /* required */
        Body: { /* required */
          Html: {
          Charset: "UTF-8",
          Data: "<h1>Thank you for you note. :-) </h1><br/><h3>Note Title:   "+noteTitle+"<br/>Description: "+noteDescription+"</h3><br/><img src='"+noteImage+"' style='width: 200px' />"
          },
          Text: {
          Charset: "UTF-8",
          Data: "This is a plan text body."
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: 'You submitted your note, good job!'
        }
        },
      Source: 'aws.philc@gmail.com', /* required */
      ReplyToAddresses: [
        'aws.philc@gmail.com',
        /* more items */
      ],
    };

    // Create the promise and SES service object
    var sendPromise = new AWS.SES({apiVersion: '2010-12-01'}).sendEmail(params).promise();

    // Handle promise's fulfilled/rejected states
    sendPromise.then(
      function(data) {
        console.log(data.MessageId);
      }).catch(
        function(err) {
        console.error(err, err.stack);
      });




  }


  async function createNote() {
    if (!formData.name || !formData.description) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    emailConfirmation(formData.name, formData.description, formData.image);
    setNotes([ ...notes, formData ]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  }

  return (
    <div className="App">
      <h1>Phil's My Notes App</h1>
      <center>
      <table >
        <tr>
          <td>Note Title:</td>
          <td>
            <input
              onChange={e => setFormData({ ...formData, 'name': e.target.value})}
              placeholder="Note name"
              value={formData.name}
            /><br/>
          </td>
        </tr>
        <tr>
          <td>Description:&nbsp;&nbsp;</td>
          <td>
            <input
              onChange={e => setFormData({ ...formData, 'description': e.target.value})}
              placeholder="Note description"
              value={formData.description}
            /><br/>
          </td>
        </tr>
        <tr>
          <td>Image:</td>
          <td>
            <input
              type="file"
              onChange={onChange}
            />
          </td>
        </tr>
      </table>
      <br/>
      <button onClick={createNote}>Create Note</button>
      </center>
      <br/><br/>
      <div style={{marginBottom: 30}}>
      {
        notes.map(note => (
          <div key={note.id || note.name}>
            <hr></hr>
            <h2>{note.name}</h2>
            <p>{note.description}</p>
            {
              note.image && <img src={note.image} style={{width: 400}} alt={note.description} />
            }
            <p><button onClick={() => deleteNote(note)}>Delete note</button></p>
          </div>
        ))
      }
      </div>
      <AmplifySignOut />
    </div>
  );
}


export default withAuthenticator(App);