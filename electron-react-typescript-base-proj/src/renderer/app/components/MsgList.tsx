import * as React from 'react';
import { getTime, getDate } from '../../libs/timestamp-converter';
import { Message } from '../../models/Message';
import { Conversation } from '../../models/Conversation';
import { getShortName } from '../../libs/messengerLoader';

interface MsgProps {
    msgs: Message[];
    convo: Conversation;
    // uuid: string;
}

interface MsgListState {
    msgs: Message[];
    convo: Conversation;
    unreadExists: boolean;
}

class MsgList extends React.Component<MsgProps, MsgListState> {
    userId: string = "admin"
    private scrollTarget = React.createRef<HTMLDivElement>();
    private scrollView = React.createRef<HTMLDivElement>();

    isReadAt(before: number, after: number) {
        console.log(this.state.unreadExists)
        return this.state.convo && this.state.unreadExists && this.state.convo.readAt >= before && this.state.convo.readAt < after;
    }

    isContinuous(before: Message, after: Message) {
        if (!before || !after) {
            return false;
        }

        if (before.sendUserId != after.sendUserId) {
            return false;
        }
        let diff = after.createdAt - before.createdAt;
        let afterDate = new Date(after.createdAt);
        let beforeDate = new Date(before.createdAt);

        return diff < 60 * 1000 && beforeDate.getMinutes() == afterDate.getMinutes();
    }

    diffDays(before: number, after: number) {
        if (before == undefined) {
            return 1;
        } else {
            var diff = after - before;
            var afterDate = new Date(after);
            var todayMilliseconds = ((((afterDate.getHours() * 60) + afterDate.getMinutes()) * 60 + afterDate.getSeconds()) * 1000);
            return Math.floor((diff + (24 * 60 * 60 * 1000) - todayMilliseconds) / (24 * 60 * 60 * 1000));
        }
    };

    getMsgDate(date: number) {
        return (
            <div className="wrapmsgr_date ng-scope" ng-if="diffDays(current.messages[$index-1].createdAt, message.createdAt) >= 1">
                <span className="ng-binding">{getDate(date)}</span>
            </div>
        )
    }

    getSystemMsg(body: string) {
        let msgspan;

        msgspan = <span className="ng-binding">{body}<a href="" className="wrapmsgr_right"></a></span>;

        return (
            <div className="wrapmsgr_msg_system ng-scope" ng-className="{revision: message.messageType == MESSAGE_TYPE_SYSTEM_REVISION}" ng-if="message.messageType >= MESSAGE_TYPE_SYSTEM">
                {msgspan}
            </div>
        )
    }

    getUserMsg(msg: Message, index: number) {
        let time;
        let profile;
        if (!this.isContinuous(this.state.msgs[index-1], msg)) {
            profile = <React.Fragment><div className="wrapmsgr_msg_user ng-isolate-scope" ng-attr-title="{{users[message.sendUserId].userName}}" wrapmsgr-user-profile="users[message.sendUserId]" user-profile-disabled="message.sendUserId.substr(0, 5) == '@BOT@'" title="administrator">
                <span className="user-photo ng-binding ng-isolate-scope no-photo cyan">{getShortName(msg.sendUserId)}</span>
            </div>
                <div className="wrapmsgr_msg_userid ng-binding">{msg.sendUserId}</div></React.Fragment>
        }
        if (!this.isContinuous(msg, this.state.msgs[index + 1])) {
            time = <div className="wrapmsgr_msg_time">
                <span className="wrapmsgr_msg_unread ng-binding">1</span>
                <span className="ng-binding">{getTime(msg.createdAt)}</span>
            </div>;
        }

        // {'continuous': isContinuous(current.messages[$index-1], message)}
        return (
            <div className="wrapmsgr_msg ng-scope" ng-if="message.messageType < MESSAGE_TYPE_SYSTEM" ng-className="{'continuous': isContinuous(current.messages[$index-1], message)}">
                {profile}
                <div className="wrapmsgr_msg_bubble-wrap">
                    <div className="wrapmsgr_msg_bubble">
                        <div className="wrapmsgr_msg_body ng-binding" ng-bind-html="message.body | linky:'_blank'">{msg.body}</div>
                    </div>
                    {time}
                </div>
            </div>
        )
    }

    getMsgBody(msg: Message, index: number) {
        let msgbubble;
        let msgbody;

        if (msg.sendUserId === "@SYS@")
            msgbubble = this.getSystemMsg(msg.body);
        else
            msgbubble = this.getUserMsg(msg, index);


        let prev = this.state.msgs[index - 1];
        let diff: number = 1;
        let readAt: boolean = false;
        let readUntil: any;
        if (prev) {
            diff = this.diffDays(prev.createdAt, msg.createdAt)
            readAt = this.isReadAt(prev.createdAt, msg.createdAt)
        }

        if (readAt)
            readUntil = this.getSystemMsg('여기까지 읽었습니다');
        else
            readUntil = '';
        msgbody = <React.Fragment>{readUntil}{msgbubble}</React.Fragment>;

        console.log(readAt)


        if (diff >= 1) {
            let dateprops = this.getMsgDate(msg.createdAt);
            msgbody = <React.Fragment>{dateprops}{readUntil}{msgbubble}</React.Fragment>;
            // 더하기 메세지버블 + bubble
        }


        if (msg.sendUserId === "admin") { // 나중에 자신의 sendUserId로 수정
            return (
                <li id={msg.id} ng-repeat="message in current.messages" className="li-right ng-scope">
                    {msgbody}
                </li>
            )
        } else {
            return (
                <li id={msg.id} ng-repeat="message in current.messages" className="ng-scope">
                    {msgbody}
                </li>
            )
        }
    }

    messagesScrollToMessage() {

    }

    messageOnScroll() {
        console.log('scrolling')
    }

    messagesScrollToBottom() {

    }

    messagesScrollToLatestMessage = () => {
        const node: HTMLDivElement | null = this.scrollTarget.current; //get the element via ref

        if (node) { //current ref can be null, so we have to check
            node.scrollIntoView({ behavior: 'auto', inline: 'start' }); //scroll to the targeted element
        }

        const scrollView: HTMLDivElement | null = this.scrollView.current;
        if (scrollView) {
            scrollView.addEventListener('scroll', this.messageOnScroll);
        }
        // window.addEventListener('scroll', this.messageOnScroll);

        // connect('api.message.list', 'admin', { 'convoId': this.props.convoId, "direction": "backward", "afterAt": 1594776538458, "beforeAt": 0 })
        // publishApi(this.state.client, 'api.message.list', 'admin', this.props.uuid, { 'convoId': this.props.convoId, "direction": "forward", "afterAt": 1594776538458 });
    }

    constructor(props: MsgProps) {
        super(props);
    }

    componentDidMount() {
        console.log(this.state.msgs);
        this.setState({ msgs: this.props.msgs });
        this.messagesScrollToLatestMessage();
    }

    componentDidUpdate() {
        this.messagesScrollToLatestMessage();
    }

    render() {
        let unreadExists = (this.props.convo.unread > 0)
        console.log('unreadexist' + unreadExists)
        this.state = ({ msgs: this.props.msgs, convo: this.props.convo, unreadExists: (this.props.convo.unread > 0) });
        return (
            <div className="wrapmsgr_content" ng-class="{'no-header': current.convo.convoType == 2}">
                <div className="wrapmsgr_messages" in-view-container="" ref={this.scrollView}>
                    <ul>
                        {this.state.msgs.map((msg: Message, index: number) =>
                            this.getMsgBody(msg, index)
                        )}
                    </ul>
                    <div className="wrapmsgr_latest_message ng-hide" ng-show="current.latestMessage" onClick={this.messagesScrollToLatestMessage}>
                        <i className="icon_arrow_down"></i>
                    </div>
                    <div ref={this.scrollTarget} data-explanation="This is where we scroll to"></div>

                </div>
            </div>
        )
    }
}

export default MsgList;