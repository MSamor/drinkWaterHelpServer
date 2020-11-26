const axios = require('axios');
var ACCESS_TOKEN = ''
//获取token
function getToken() {
    return axios.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=wx8f615bc611845df9&secret=14de1ddd87003246f4920d94f3cc599e')
        .then(function (response) {
            console.log(response.data);
            ACCESS_TOKEN = response.data.access_token
        })
        .catch(function (error) {})
        .then(function () {});
}
//数据库查询
function queryDB() {
    return axios.post('https://api.weixin.qq.com/tcb/databasequery?access_token=' + ACCESS_TOKEN, {
        "env": "remember-gi74y",
        "query": "db.collection(\"plan\").get()"
    })
}
//下一次推送时间添加
function upDataNextTime(openid, nextTime) {
    return axios.post('https://api.weixin.qq.com/tcb/databaseupdate?access_token=' + ACCESS_TOKEN, {
        "env": "remember-gi74y",
        "query": "db.collection(\"plan\").where({openid:\"" + openid + "\"}).update({data:{nextTime: \"" + nextTime + "\"}})"
    })
}
//发送推送
function send(OPENID, drinkTime) {
    return axios.post('https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=' + ACCESS_TOKEN, {
            "touser": OPENID,
            "template_id": "0W7Bz7a_eIaTpu2JtY057evKvXf8Etd-oa-SG9T3xeg",
            "lang": "zh_CN",
            "data": {
                "thing1": {
                    "value": "喝水签到"
                },
                "thing4": {
                    "value": "记得去喝水签到哦"
                },
                "number3": {
                    "value": drinkTime
                }
            }
        })
        .then(function (response) {
            console.log(response.data);
        })
        .catch(function (error) {
            console.log(error);
        })
        .then(function () {
            // always executed
        });
}

async function main() {
    let mainTimeCurrent = new Date() //当前时间
    await getToken() //获取后台token
    let data = await queryDB() //查询数据库
    data = data.data.data
    for (let i = 0; i < data.length; i++) {
        let el = data[i];
        el = JSON.parse(el) //每个用户的数据
        let nextTimeDate = (((parseInt(el.endTime.split(":")[0]) - parseInt(el.openTime.split(":")[0])) / el.planTime).toFixed(1))
        nextTimeDate = mainTimeCurrent.getHours() * 60 + mainTimeCurrent.getMinutes() + nextTimeDate * 60
        console.log(el.nextTime, "数据库时间", mainTimeCurrent.getHours() * 60 + mainTimeCurrent.getMinutes(), "当前时间")
        if (parseInt(el.openTime.split(":")[0]) * 60 +
            parseInt(el.openTime.split(":")[1]) <
            mainTimeCurrent.getHours()*60 +
            mainTimeCurrent.getMinutes() &&
            parseInt(el.endTime.split(":")[0]) * 60 +
            parseInt(el.endTime.split(":")[1]) >
            mainTimeCurrent.getHours()*60 +
            mainTimeCurrent.getMinutes()
        ) { //起床时间判断
            if (el.drinkTime.length < el.planTime) { //喝水次数少于计划次数
                if (el.nextTime == (mainTimeCurrent.getHours() * 60 + mainTimeCurrent.getMinutes())) { //数据库下一此等于 当前
                    await send(el.openid, el.drinkTime.length) //发送推送，参数为  openid 和 已签到次数
                    console.log("推送")
                    await upDataNextTime(el.openid, nextTimeDate)
                } else if (el.nextTime == '') {
                    console.log("初次执行")
                    let res = await upDataNextTime(el.openid, nextTimeDate)
                    await send(el.openid, el.drinkTime.length)
                    console.log(res.data)
                } else if (el.nextTime == undefined) {
                    console.log("undeif执行")
                    let res = await upDataNextTime(el.openid, nextTimeDate)
                    await send(el.openid, el.drinkTime.length)
                    console.log(res.data)
                }
            }
        } else if (mainTimeCurrent.getHours() * 60 + mainTimeCurrent.getMinutes() == parseInt(el.openTime.split(":")[0]) * 60 + parseInt(el.openTime.split(":")[1])) {
            console.log("一天的第一次")
            let res = await upDataNextTime(el.openid, nextTimeDate)
            await send(el.openid, 0)
            console.log(res.data)
            axios.post('https://api.weixin.qq.com/tcb/databaseupdate?access_token=' + ACCESS_TOKEN, {
                "env": "remember-gi74y",
                "query": "db.collection(\"plan\").where({openid:\"" + openid + "\"}).update({data:{drinkTime: \" [] \"}})"
            })
        }
    }
}

timmer = setInterval(() => {
    main()
}, 60000)