import { createStore, bindActionCreators } from 'redux';
import { sendNotification } from './renderer/libs/notification';
import { remote } from 'electron';
import * as etype from '@/renderer/libs/enum-type';
import { BotIntent } from './renderer/models/BotIntent';
const Store = require('electron-store')
const electronStore = new Store()

export default createStore(function (state: any, action: any) {
    console.log("---------------store----------------")
    console.log(state)
    console.log(action)
    if (state === undefined && action.type != "selectedList") {
        return { tempMembers: [], topMsgId: null, msgs: [] }
    }
    if (action.type === "setOldMembers") {
        return { ...state, oldMembers: action.oldMembers }
    }
    if (action.type === "clickMember") {
        let idx, idx2;
        idx = state.tempMembers.findIndex(obj => obj.userId === action.newMember[0].userId)
        idx2 = state.oldMembers.findIndex(obj => obj.userId === action.newMember[0].userId)
        if (idx == -1 && idx2 == -1) {
            return { ...state, tempMembers: state.tempMembers.concat(action.newMember) }
        }
        if (idx > -1) {
            state.tempMembers.splice(idx, 1)
            return { ...state, tempMembers: state.tempMembers }
        }
    }
    if (action.type === 'clickDept' && action.childNodes != undefined && action.childNodes.length > 0) {
        action.childNodes.map(node => {
            if (node.type === "user") {
                let idx, idx2;
                idx = state.tempMembers.findIndex(obj => obj.userId === node.value)
                idx2 = state.oldMembers.findIndex(obj => obj.userId === node.value)
                if (idx == -1 && idx2 == -1) {
                    state.tempMembers = state.tempMembers.concat([{ "userId": node.value, "userName": node.columnText, "password": null }])
                }
                if (idx > -1) {
                    state.tempMembers.splice(idx, 1)
                }
            }
        })
        return { ...state, tempMembers: state.tempMembers }
    }


    if (action.type === 'addMembers') {
        console.log("-----------------store에서 addMembers----------------------------")
        console.log(state)
        if (state.members != undefined && state.members.length > 0) {
            state.members = state.members.concat(action.members)
            console.log(state.members)
        }
        console.log("..................................")
        return { ...state, members: state.oldMembers.concat() }
    }

    if (action.type === 'setClient') {
        return { ...state, client: action.client }
    }

    if (action.type === 'setElectron') {
        return { ...state, electron: action.electron }
    }

    if (action.type === 'setConvoList') {
        return { ...state, convos: action.convos }
    }


    if (action.type === 'setRoom') {
        let topMsgId = action.room.Messages[action.room.Messages.length - 1].messageId;
        let bot, botIntent;
        if (action.room.Bot) {
            bot = action.room.Bot;
            botIntent = action.room.BotIntentGroup;
        }
        console.log(action.room.botIntentGroup)
        return { ...state, convo: action.room.Conversation, msgs: action.room.Messages, members: action.room.Members, topMsgId, bot, botIntent }
    }

    if (action.type === 'sysMsg') {
        if (state.convo && action.msg.recvConvoId === state.convo.convoId) {
            let body = JSON.parse(action.msg.body);
            let convo;
            console.log(body.cmdType)
            if (body.cmdType === etype.Command.BOOKMARK_START) {
                convo = {
                    ...state.convo,
                    properties: {
                        ...state.convo.properties,
                        bookmark: "Y"
                    }
                }
            } else if (body.cmdType === etype.Command.BOOKMARK_STOP) {
                convo = {
                    ...state.convo,
                    properties: {
                        ...state.convo.properties,
                        bookmark: "N"
                    }
                }
            } else if (body.cmdType === etype.Command.DEADLINE) {
                console.log('+++++++++++++')
                console.log(body.body)
                convo = {
                    ...state.convo,
                    properties: {
                        ...state.convo.properties,
                        deadline: body.body
                    }
                }
            } else {
                convo = { ...state.convo }
            }
            return {
                ...state,
                msgs: state.msgs.concat(action.msg),
                topMsgId: action.msg.messageId,
                convo
            };
        }
    }

    if (action.type === 'recvMsg') {
        // 채팅방 내부에서의 메세지 수신 처리
        console.log(action.msg)
        if (state.convo && action.msg.recvConvoId === state.convo.convoId) {
            return {
                ...state,
                msgs: state.msgs.concat(action.msg),
                topMsgId: action.msg.messageId
            };
        }

        // 채팅방 리스트에서의 메세지 수신 처리
        if (state.convos) {
            const index = state.convos.findIndex(convo => convo.convoId === action.msg.recvConvoId),
                convos = state.convos // important to create a copy, otherwise you'll modify state outside of setState call
            convos[index].latestMessage = action.msg.body;
            if (action.msg.sendUserId !== electronStore.get("username")) {
                if (state.electron.isBrowserOpened(convos[index].browserId)) {
                    // 윈도우 창이 열려있는 경우 
                    convos[index].unread = 0;
                }
                else {
                    // 윈도우 창이 닫혀있는 경우 안읽은 메세지 카운트 증가, notificiation 전송
                    convos[index].unread += 1;
                    if (convos[index].notificationType === 1) {
                        var win = remote.getCurrentWindow()
                        sendNotification('새로운 메세지가 도착했습니다', action.msg.sendUserId, action.msg.body || action.msg.messageId);
                        win.once('focus', () => win.flashFrame(false))
                        win.flashFrame(true)
                    }

                }
            }
            convos[index].latestMessageAt = action.msg.updatedAt;
            return { ...state, convos: convos, topMsgId: "0" }
        }


        // this.setState({ convos: convos });
    }

    // 위로 스크롤 해 메세지 가져오는 경우
    if (action.type === 'getMsgsBackward') {
        let eom: boolean;
        if (action.msgs.length === 20)
            eom = false;
        else
            eom = true;
        if (action.msgs.length !== 0)
            return { ...state, msgs: action.msgs.concat(state.msgs), topMsgId: action.msgs[action.msgs.length - 1].messageId, eom }
        else
            return { ...state, msgs: action.msgs.concat(state.msgs), eom }
    }

    if (action.type === 'getBotCommands') {
        let idx = state.botIntent.findIndex(obj => obj.groupId === action.payload.groupId)
        let botIntent: BotIntent = state.botIntent;
        botIntent[idx].commands = action.payload.BotCommands;
        return { ...state, botIntent }
    }

    if (action.type === 'getBookmarks') {
        return { ...state, bookmarks: action.bookmarks }
    }

    if (action.type === 'getMsgs') {
        let eom: boolean;
        if (action.msgs.length === 20)
            eom = false;
        else
            eom = true;
        return { ...state, msgs: action.msgs, eom }
    }

    if (action.type === 'concatMsgs') {
        let eom: boolean;
        if (action.msgs.length === 20)
            eom = false;
        else
            eom = true;
        return { ...state, msgs: state.msgs.concat(action.msgs), eom }
    }

    if (action.type === 'deleteBookmark') {
        let found = state.bookmarks.find(element => element.bookmarkId === action.bookmark.bookmarkId);
        let index = state.bookmarks.indexOf(found);
        console.log(index)
        state.bookmarks.splice(index, 1);
        return {
            ...state,
            bookmarks: state.bookmarks
        };
    }

    if (action.type === 'updateNotification') {
        if (state.convos) {
            let idx = state.convos.findIndex(obj => obj.convoId === action.notification.convoId);
            let convos = state.convos;
            convos[idx].notificationType = action.notification.type;
            return {
                ...state,
                convos
            }
        } else if (state.convo) {
            return {
                ...state,
                convo: {
                    notificationType: action.notification.type
                }
            }
        }
    }

    return state;
})

