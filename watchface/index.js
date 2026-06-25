    /*
     ** Watch_Face_Editor tool v 18.0
     ** watchface js version v2.1.1
     ** Copyright © SashaCX75. All Rights Reserved
     */

     try {
     (() => {
         //start of ignored block
         const __$$app$$__ = __$$hmAppManager$$__.currentApp;
         function getApp() {
             return __$$app$$__.app;
         }
         function getCurrentPage() {
             return __$$app$$__.current && __$$app$$__.current.module;
         }
         const __$$module$$__ = __$$app$$__.current;
         const h = new DeviceRuntimeCore.WidgetFactory(new DeviceRuntimeCore.HmDomApi(__$$app$$__, __$$module$$__));
         const {px} = __$$app$$__.__globals__;
         const logger = DeviceRuntimeCore.HmLogger.getLogger('watchface_convert');
         //end of ignored block

         //dynamic modify start

         let normal_background_bg_img = '';
         let normal_vaultboy_img = '';
         let normal_vaultboy_frames = ['0057.png','0058.png','0059.png','0060.png','0061.png','0062.png','0063.png','0064.png'];
         let normal_vaultboy_index = 0;
         let normal_vaultboy_timer = undefined;
         let normal_digital_clock_img_time = '';
         let normal_second_TextRotate = new Array(2);
         let normal_second_TextRotate_ASCIIARRAY = new Array(10);
         let normal_second_TextRotate_img_width = 17;
         let normal_timerTextUpdate = undefined;
         let normal_ampm_img = '';
         let normal_date_day_img = new Array(2);
         let normal_date_month_img = new Array(2);
         let normal_date_year_img = new Array(4);
         let normal_date_ASCIIARRAY = new Array(10);
         let normal_dow_text_font = '';
         let normal_DOW_Array = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
         let normal_step_current_text_font = '';
         let normal_calorie_current_text_font = '';
         let normal_heart_rate_text_font = '';
         let normal_distance_current_text_font = '';
         let normal_battery_current_text_font = '';
         let normal_battery_percent_img = '';
         let normal_system_disconnect_img = '';
         let normal_system_clock_img = '';
         let timeSensor = '';

         //dynamic modify end

         __$$module$$__.module = DeviceRuntimeCore.WatchFace({
             init_view() {
                 //dynamic modify start

             normal_background_bg_img = hmUI.createWidget(hmUI.widget.IMG, {
               x: 0, y: 0, w: 480, h: 480,
               src: '0000.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             // Date: per-digit IMG widgets updated from the TIME sensor
             normal_date_ASCIIARRAY[0] = '0011.png';
             normal_date_ASCIIARRAY[1] = '0012.png';
             normal_date_ASCIIARRAY[2] = '0013.png';
             normal_date_ASCIIARRAY[3] = '0014.png';
             normal_date_ASCIIARRAY[4] = '0015.png';
             normal_date_ASCIIARRAY[5] = '0016.png';
             normal_date_ASCIIARRAY[6] = '0017.png';
             normal_date_ASCIIARRAY[7] = '0018.png';
             normal_date_ASCIIARRAY[8] = '0019.png';
             normal_date_ASCIIARRAY[9] = '0020.png';

             normal_date_day_img[0] = hmUI.createWidget(hmUI.widget.IMG, {
               x: 82, y: 78,
               src: '0011.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });
             normal_date_day_img[1] = hmUI.createWidget(hmUI.widget.IMG, {
               x: 94, y: 78,
               src: '0011.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });
             normal_date_month_img[0] = hmUI.createWidget(hmUI.widget.IMG, {
               x: 111, y: 78,
               src: '0011.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });
             normal_date_month_img[1] = hmUI.createWidget(hmUI.widget.IMG, {
               x: 123, y: 78,
               src: '0011.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });
             normal_date_year_img[0] = hmUI.createWidget(hmUI.widget.IMG, {
               x: 143, y: 78,
               src: '0011.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });
             normal_date_year_img[1] = hmUI.createWidget(hmUI.widget.IMG, {
               x: 155, y: 78,
               src: '0011.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });
             normal_date_year_img[2] = hmUI.createWidget(hmUI.widget.IMG, {
               x: 167, y: 78,
               src: '0011.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });
             normal_date_year_img[3] = hmUI.createWidget(hmUI.widget.IMG, {
               x: 179, y: 78,
               src: '0011.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_dow_text_font = hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
               x: 150, y: 24,
               image_array: ["0026.png", "0027.png", "0028.png", "0029.png", "0030.png", "0031.png", "0032.png"],
               image_length: 7,
               type: hmUI.data_type.WEEK,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             // Weather icon
             hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
               x: 330, y: 78,
               image_array: ["0079.png","0080.png","0081.png","0082.png","0083.png","0084.png","0085.png","0086.png","0087.png","0088.png","0089.png","0090.png","0091.png","0092.png","0093.png","0094.png","0095.png","0096.png","0097.png","0098.png","0099.png","0100.png","0101.png","0102.png","0103.png","0104.png","0105.png"],
               image_length: 27,
               type: hmUI.data_type.WEATHER_CURRENT,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             // Temperature value
             hmUI.createWidget(hmUI.widget.TEXT_IMG, {
               x: 338, y: 78, w: 56, h: 24,
               font_array: ["0011.png", "0012.png", "0013.png", "0014.png", "0015.png", "0016.png", "0017.png", "0018.png", "0019.png", "0020.png"],
               h_space: -3,
               negative_image: '0021.png',
               align_h: hmUI.align.RIGHT,
               type: hmUI.data_type.WEATHER_CURRENT,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             // Degree symbol
             hmUI.createWidget(hmUI.widget.IMG, {
               x: 394, y: 78,
               src: '0023.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_vaultboy_img = hmUI.createWidget(hmUI.widget.IMG, {
               x: 183, y: 130,
               src: '0057.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_digital_clock_img_time = hmUI.createWidget(hmUI.widget.IMG_TIME, {
               hour_startX: 328,
               hour_startY: 132,
               hour_array: ["0001.png", "0002.png", "0003.png", "0004.png", "0005.png", "0006.png", "0007.png", "0008.png", "0009.png", "0010.png"],
               hour_zero: 1,
               hour_align: hmUI.align.LEFT,

               minute_startX: 328,
               minute_startY: 246,
               minute_array: ["0001.png", "0002.png", "0003.png", "0004.png", "0005.png", "0006.png", "0007.png", "0008.png", "0009.png", "0010.png"],
               minute_zero: 1,
               minute_follow: 0,
               minute_align: hmUI.align.LEFT,

               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_second_TextRotate_ASCIIARRAY[0] = '0011.png';
             normal_second_TextRotate_ASCIIARRAY[1] = '0012.png';
             normal_second_TextRotate_ASCIIARRAY[2] = '0013.png';
             normal_second_TextRotate_ASCIIARRAY[3] = '0014.png';
             normal_second_TextRotate_ASCIIARRAY[4] = '0015.png';
             normal_second_TextRotate_ASCIIARRAY[5] = '0016.png';
             normal_second_TextRotate_ASCIIARRAY[6] = '0017.png';
             normal_second_TextRotate_ASCIIARRAY[7] = '0018.png';
             normal_second_TextRotate_ASCIIARRAY[8] = '0019.png';
             normal_second_TextRotate_ASCIIARRAY[9] = '0020.png';

             //#region TextRotate
             for (let i = 0; i < 2; i++) {
               normal_second_TextRotate[i] = hmUI.createWidget(hmUI.widget.IMG, {
                 x: 0, y: 0, w: 480, h: 480,
                 center_x: 379, center_y: 360,
                 pos_x: 371, pos_y: 348,
                 angle: 0,
                 src: '0011.png',
                 show_level: hmUI.show_level.ONLY_NORMAL,
               });
               normal_second_TextRotate[i].setProperty(hmUI.prop.VISIBLE, false);
             };
             //#endregion

             normal_ampm_img = hmUI.createWidget(hmUI.widget.IMG, {
               x: 366, y: 371,
               src: '0024.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });
             normal_ampm_img.setProperty(hmUI.prop.VISIBLE, false);

             normal_calorie_current_text_font = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
               x: 17, y: 149, w: 72, h: 24,
               font_array: ["0069.png", "0070.png", "0071.png", "0072.png", "0073.png", "0074.png", "0075.png", "0076.png", "0077.png", "0078.png"],
               h_space: -3,
               align_h: hmUI.align.RIGHT,
               type: hmUI.data_type.CAL,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_heart_rate_text_font = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
               x: 15, y: 216, w: 58, h: 24,
               font_array: ["0069.png", "0070.png", "0071.png", "0072.png", "0073.png", "0074.png", "0075.png", "0076.png", "0077.png", "0078.png"],
               h_space: -3,
               align_h: hmUI.align.RIGHT,
               type: hmUI.data_type.HEART,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_distance_current_text_font = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
               x: 8, y: 277, w: 80, h: 24,
               font_array: ["0069.png", "0070.png", "0071.png", "0072.png", "0073.png", "0074.png", "0075.png", "0076.png", "0077.png", "0078.png"],
               h_space: -3,
               dot_image: '0034.png',
               align_h: hmUI.align.RIGHT,
               type: hmUI.data_type.DISTANCE,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_step_current_text_font = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
               x: 195, y: 369, w: 96, h: 24,
               font_array: ["0069.png", "0070.png", "0071.png", "0072.png", "0073.png", "0074.png", "0075.png", "0076.png", "0077.png", "0078.png"],
               h_space: -3,
               align_h: hmUI.align.CENTER_H,
               type: hmUI.data_type.STEP,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
               x: 90, y: 159, w: 69, h: 15,
               image_array: ["0200.png", "0201.png", "0202.png", "0203.png", "0204.png", "0205.png"],
               image_length: 6,
               type: hmUI.data_type.CAL,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
               x: 73, y: 224, w: 72, h: 13,
               image_array: ["0206.png", "0207.png", "0208.png", "0209.png", "0210.png", "0211.png"],
               image_length: 6,
               type: hmUI.data_type.HEART,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
               x: 90, y: 286, w: 69, h: 15,
               image_array: ["0212.png", "0213.png", "0214.png", "0215.png", "0216.png", "0217.png"],
               image_length: 6,
               type: hmUI.data_type.STEP,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             hmUI.createWidget(hmUI.widget.IMG_LEVEL, {
               x: 194, y: 349, w: 91, h: 15,
               image_array: ["0218.png", "0219.png", "0220.png", "0221.png", "0222.png", "0223.png"],
               image_length: 6,
               type: hmUI.data_type.STEP,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_battery_current_text_font = hmUI.createWidget(hmUI.widget.TEXT_IMG, {
               x: 74, y: 379, w: 58, h: 24,
               font_array: ["0069.png", "0070.png", "0071.png", "0072.png", "0073.png", "0074.png", "0075.png", "0076.png", "0077.png", "0078.png"],
               h_space: -3,
               align_h: hmUI.align.RIGHT,
               type: hmUI.data_type.BATTERY,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_battery_percent_img = hmUI.createWidget(hmUI.widget.IMG, {
               x: 132, y: 379,
               src: '0035.png',
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_system_disconnect_img = hmUI.createWidget(hmUI.widget.IMG_STATUS, {
               x: 312, y: 368,
               src: '0054.png',
               type: hmUI.system_status.DISCONNECT,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             // Lock icon
             hmUI.createWidget(hmUI.widget.IMG_STATUS, {
               x: 351, y: 368,
               src: '0052.png',
               type: hmUI.system_status.LOCK,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             normal_system_clock_img = hmUI.createWidget(hmUI.widget.IMG_STATUS, {
               x: 405, y: 366,
               src: '0055.png',
               type: hmUI.system_status.CLOCK,
               show_level: hmUI.show_level.ONLY_NORMAL,
             });

             if (!timeSensor) timeSensor = hmSensor.createSensor(hmSensor.id.TIME);
             timeSensor.addEventListener(timeSensor.event.DAYCHANGE, function() {
               time_update(true, true);
               date_update();
               ampm_update();
             });

             let screenType = hmSetting.getScreenType();

             //#region time_update
             function time_update(updateHour = false, updateMinute = false) {
               console.log('time_update()');
             };
             //#endregion

             //#region date_update
             function date_update() {
               let dStr = parseInt(timeSensor.day).toString().padStart(2, '0');
               let moStr = parseInt(timeSensor.month).toString().padStart(2, '0');
               let yStr = parseInt(timeSensor.year).toString().padStart(4, '0');
               for (let i = 0; i < 2; i++) {
                 normal_date_day_img[i].setProperty(hmUI.prop.SRC, normal_date_ASCIIARRAY[dStr.charCodeAt(i) - 48]);
                 normal_date_month_img[i].setProperty(hmUI.prop.SRC, normal_date_ASCIIARRAY[moStr.charCodeAt(i) - 48]);
               };
               for (let i = 0; i < 4; i++) {
                 normal_date_year_img[i].setProperty(hmUI.prop.SRC, normal_date_ASCIIARRAY[yStr.charCodeAt(i) - 48]);
               };
             };
             //#endregion

             //#region ampm_update
             function ampm_update() {
               try {
                 let is12h = hmSetting.getTimeFormat() == 0;  // 0 = 12-hour, 1 = 24-hour
                 if (!is12h) { normal_ampm_img.setProperty(hmUI.prop.VISIBLE, false); return; };
                 let src = timeSensor.hour < 12 ? '0024.png' : '0025.png';
                 normal_ampm_img.setProperty(hmUI.prop.SRC, src);
                 normal_ampm_img.setProperty(hmUI.prop.VISIBLE, true);
               } catch (e) { console.log("ampm_update error", e); }
             };
             //#endregion

             //#region text_update
             function text_update() {
               console.log('text_update()');
               let valueSecond = timeSensor.second;
               let secStr = parseInt(valueSecond).toString().padStart(2, '0');

               if (screenType != hmSetting.screen_type.AOD) {
                 for (var i = 1; i < 2; i++) {
                   normal_second_TextRotate[i].setProperty(hmUI.prop.VISIBLE, false);
                 };
                 if (valueSecond != null && valueSecond != undefined && isFinite(valueSecond) && secStr.length > 0 && secStr.length <= 2) {
                   let img_offset = 0;
                   let index = 0;
                   for (let char of secStr) {
                     let charCode = char.charCodeAt()-48;
                     if (index >= 2) break;
                     if (charCode >= 0 && charCode < 10) {
                       normal_second_TextRotate[index].setProperty(hmUI.prop.POS_X, 371 + img_offset);
                       normal_second_TextRotate[index].setProperty(hmUI.prop.SRC, normal_second_TextRotate_ASCIIARRAY[charCode]);
                       normal_second_TextRotate[index].setProperty(hmUI.prop.VISIBLE, true);
                       img_offset += normal_second_TextRotate_img_width;
                       index++;
                     };
                   };
                 }
               };
             };
             //#endregion

             //#region vaultboy_animation
             function animate_vaultboy() {
               normal_vaultboy_index = (normal_vaultboy_index + 1) % normal_vaultboy_frames.length;
               normal_vaultboy_img.setProperty(hmUI.prop.SRC, normal_vaultboy_frames[normal_vaultboy_index]);
             };
             //#endregion

             const widgetDelegate = hmUI.createWidget(hmUI.widget.WIDGET_DELEGATE, {
               resume_call: (function () {
                 console.log('resume_call()');
                 // Start timers FIRST so a failing one-shot update can never
                 // stop the Vault Boy animation / seconds (see ampm_update).
                 if (screenType == hmSetting.screen_type.WATCHFACE) {
                   if (!normal_timerTextUpdate) {
                     normal_timerTextUpdate = timer.createTimer(0, 1000, (function (option) {
                       text_update();
                     }));
                   };
                 };
                 if (!normal_vaultboy_timer) {
                   normal_vaultboy_timer = timer.createTimer(0, 200, (function (option) {
                     animate_vaultboy();
                   }));
                 };
                 time_update(true, true);
                 date_update();
                 text_update();
                 ampm_update();
               }),
               pause_call: (function () {
                 console.log('pause_call()');
                 if (normal_timerTextUpdate) {
                   timer.stopTimer(normal_timerTextUpdate);
                   normal_timerTextUpdate = undefined;
                 }
                 if (normal_vaultboy_timer) {
                   timer.stopTimer(normal_vaultboy_timer);
                   normal_vaultboy_timer = undefined;
                 }
               }),
             });

                 //dynamic modify end
             },
             onInit() {
                 logger.log('index page.js on init invoke');
             },
             build() {
                 this.init_view();
                 logger.log('index page.js on ready invoke');
             },
             onDestroy() {
                 logger.log('index page.js on destroy invoke');
             }
         });
         ;
     })();
     } catch (e) {
         console.log('Mini Program Error', e);
         e && e.stack && e.stack.split(/\n/).forEach(i => console.log('error stack', i));
         ;
     }