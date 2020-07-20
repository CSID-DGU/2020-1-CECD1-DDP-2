import { Component, Fragment } from 'react';
import React from 'react';
import { createClient, subscribe, publishApi, client } from '@/renderer/libs/stomp';
import ReactDOM from 'react-dom';
import DocumentChatRoom from '../ChatRoom/Document';
import { v4 } from "uuid"
import { getConvoDate } from '@/renderer/libs/timestamp-converter';
import {getDocType} from '@/renderer/libs/messengerLoader'
import { Client } from '@stomp/stompjs';
import { Conversation } from '@/renderer/models/Conversation';
import { sortConvos } from '@/renderer/libs/sort';


const {remote, webContents} = require('electron')
const {BrowserWindow} = remote
console.log(__dirname)

interface ChatListState {
    client: Client,
    convos: Conversation[],
    len: number,
    uuid: string;
}

interface ChatListProps {
    search: string
}

class Chat extends Component<ChatListProps, ChatListState> {
    _isMounted: boolean = false;
    roomName: [] = [];
    roomDate: [] = [];
    roomRead: [] = [];
    payload: any;
    search: string = "";
    state: any = { 
        payload: [],
    };
    convoId: string = "";
    uuid: string = "";
    chatBotImgPath = "http://ecm.dev.fasoo.com:9400/images/icon_bot_wrapsody.png"


    

    getConvo = (convoId: string, name:string) => (event: any) => {
        const chatWindow = new BrowserWindow(
            {
                titleBarStyle: "hidden",
                frame:false,
                width:800,
                height:700,
                minHeight: 200,
                minWidth: 400
            }
        )

        
        // // and load the index.html of the app.
        chatWindow.loadURL(
            __dirname+"/index.html#/document/"+convoId          
        );

        chatWindow.setTitle(name)

        chatWindow.show()
        
    }

    stompConnection = () => {
        let obj = {};
        client.onConnect = () => {
            subscribe(client, 'admin', this.state.uuid, (obj: any) => {
                let payload = obj.payload;
                console.log(this._isMounted)
                console.log(payload)
                if (payload) {
                    if (payload.Conversations) {
                        //채팅방 시간순 정렬
                        this.setState(
                            {
                                convos: sortConvos(payload.Conversations),
                                len: payload.Conversations.length
                            },
                        )

                    }
                } else {
                    if (obj.body) {
                        console.log(obj)
                        const index = this.state.convos.findIndex(convo => convo.convoId === obj.recvConvoId),
                            convos = [...this.state.convos] // important to create a copy, otherwise you'll modify state outside of setState call
                            convos[index].latestMessage = obj.body;
                            convos[index].unread += 1;
                            convos[index].latestMessageAt = obj.updatedAt;
                            this.setState({ convos:sortConvos(convos) });

                        // console.log(this.state.convos)
                    }
                }
            });
            publishApi(client, 'api.conversation.list', 'admin', this.state.uuid, {});
        }
        client.activate();
    }

    constructor(props: ChatListProps) {
        super(props);
        this.state = ({
            uuid: v4(),
            convos: [],
            len: 0,
            client: client
        })

    }

    componentDidMount() {
        this.stompConnection();
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    checkInclude = (name:string)=>{
        if(name!==undefined){
            if(name.toLowerCase().includes(this.state.search.toLowerCase()))
            return true
        }
        return false;
    }

    
    render() {
        console.log(window.location.href)
        let convos = this.state.convos
        if (convos != undefined) {

            return (
                <Fragment>
                    {convos.map((item: any) =>
                    <Fragment>
                        {/* <Link to = {"/document/"+item.convoId}> */}
                        {/* 검색 활성화 */}
                        {this.props.search === null || item.name.toLowerCase().includes(this.props.search.toLowerCase())?
                        <li onClick={this.getConvo(item.convoId, item.name)} className="ng-scope">
                        {/* /챗봇, 문서채팅방의 아이콘 표시/ */}
                        {item.convoType ===2? 
                            <span className = "user-photo" style = {{backgroundImage:'url(http://ecm.dev.fasoo.com:9400/images/icon_bot_wrapsody.png)'}}></span>:
                            <document-icon className="ng-scope ng-isolate-scope">
                            <i className= {getDocType(item.name)}>
                                <span className="path1"></span>         <span className="path2"></span>         <span className="path3"></span>         <span className="path4"></span>         <span className="path5"></span>         <span className="path6"></span>         <span className="path7"></span>         <span className="path8"></span>         <span className="path9"></span>         <span className="path10"></span>            <span className="path11"></span>            
                            </i>
                            </document-icon>
                        }
                        <div className="title_h5" id="title_5">
                            <span className="chatroom-name">{item.name}</span>
                            <span className="chatroom-user-cnt">{item.memberCount}</span>
                            <i></i>
                            <span className="chatroom-message-contents">{item.latestMessage}</span>
                        </div>
                        <div className="wrapmsgr_right">
                            <span className="chatroom-date">{getConvoDate(item.updatedAt)}</span>
                            {/* 조건부 unread 메세지 표시 */}
                            {item.unread===0 ? null:
                                <span className="wrapmsgr_unread_outer">
                                    <span className="wrapmsgr_unread">{item.unread}</span>
                                </span>
                            }
                            

                        </div>
                    </li>
                    :
                    <Fragment></Fragment>
                        }
                        {/* </Link> */}
                        </Fragment>
                        )
                    }
                </Fragment>)
        }
    return (<div>{this.props.search}</div>)
    }
}
export default Chat;