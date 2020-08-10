import * as React from 'react';
import { publishApi, client, subscribe } from '@/renderer/libs/stomp';
import { v4 } from "uuid"
import { TreeMember } from '../../models/TreeMember';
import { Member } from '../../models/Member';
import store from '../../../store';

const Store = require('electron-store')
const electronStore = new Store()

const remote = require('electron').remote


interface Props{
    convoId : string;
}
interface State {
    uuid: string;
    tempMembers: TreeMember[];
    members: Member[];
}
class Footer extends React.Component<Props, State>{
    constructor(props: Props, state: State){
        super(props, state);
        this.state = ({
            uuid: v4(),
            tempMembers: [],
            members : [],
        });
        store.subscribe(function(this: Footer){
            this.setState({ tempMembers : store.getState().tempMembers })
        }.bind(this));
        this.closeWindow = this.closeWindow.bind(this);
        this.invite = this.invite.bind(this);
    }

    componentDidMount(){
        client.onConnect = () => {
            subscribe(client, electronStore.get("username"), this.state.uuid, (obj: any) => {
                let payload = obj.payload;
                if (payload) {
                    if (payload.Members) {
                        this.setState({
                            members: payload.Members
                        },() => store.dispatch({type : 'setMembers', members: this.state.members}))
                    }
                }
            });
        }  
    }

    closeWindow = () => {
        var win = remote.getCurrentWindow()
        win.close()
    }

    invite = (e) =>{
        e.preventDefault();
        let userIds = [];
        this.state.tempMembers.map(member=>{
            userIds = userIds.concat([member.userId])
        })
        publishApi(client, "api.room.invite", electronStore.get("username"), this.state.uuid, {convoId: this.props.convoId, userIds:userIds})
        publishApi(client, 'api.conversation.view', electronStore.get("username"), this.state.uuid, { 'convoId': this.props.convoId });
        // this.closeWindow()
    }

    render(){
        return (
            <div className="wrapmsgr_popup_footer">
                <input type="submit" className="wrapmsgr_button primary wrapmsgr_right" value="OK" onClick = {this.invite} ng-disabled="!loggedIn" />
                <input type="button" className="wrapmsgr_button wrapmsgr_right" value="Cancel" ng-disabled="!loggedIn" ng-click="hidePopup($event)" onClick = {this.closeWindow} />
            </div>
        );
    }
}

export default Footer;

