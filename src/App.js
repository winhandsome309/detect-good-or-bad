import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import { initNotifications, notify } from '@mycv/f8-notification';
import { Howl } from 'howler';
import soundURL from './assets/hey_win.mp3';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';

var sound = new Howl({
  src: [soundURL],
});


const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIMES = 50;
const TOUCHED_CONFIDENCE = 0.8;


function App() {

  const video = useRef();
  const canPlaySound = useRef(true);
  const classifier = useRef();
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);

  const init = async () => {
    console.log('Loading...');
    await setupCamera();

    classifier.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log('Done !');
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve);
          },
          error => reject(error)
        );
      }
      else {
        reject();
      }
    });
  }

  const train = async (label) => {
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt((i + 1) / TRAINING_TIMES * 100)}%`);
      await training(label);
    }
  }

  const training = (label) => {
    return new Promise(async (resolve) => {
      const embedding = mobilenetModule.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(
        embedding,
        label
      );
      await sleep(100);
      resolve();
    })
  }

  const run = async () => {
    const embedding = await mobilenetModule.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);

    if (result.label == TOUCHED_LABEL && result.confidences[result.label] > TOUCHED_CONFIDENCE) {
      // console.log('Touched');
      setTouched(true);
      if (canPlaySound.current) {
        sound.play();
        canPlaySound.current = false;
      }
      // notify('Bỏ tay ra!', { body: 'Bạn vừa chạm tay vào mặt' });
      notify('Warring', { body: 'Disappear!!!' })
    }
    else {
      // console.log('Not touch');
      setTouched(false);
    }

    await sleep(200);
    run();
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(() => resolve(), ms))
  }


  useEffect(() => {

    init();
    initNotifications({ cooldown: 3000 });
    sound.on('end', function () {
      canPlaySound.current = true;
    });

    return () => {

    }
  }, [])

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video
        ref={video}
        className='video'
        autoPlay
      />
      <div className='control'>
        <button className='btn_g' onClick={() => train(NOT_TOUCH_LABEL)}>Train Good</button>
        <button className='btn_b' onClick={() => train(TOUCHED_LABEL)}>Train Bad</button>
        {/* <button className='btn' onClick={() => run()}>Run Predict</button> */}
      </div>
      <button className='btn' onClick={() => run()}>Run Predict</button>
    </div>
  );
}

export default App;
