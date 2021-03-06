import * as React from 'react';
import { getShortName } from '../../libs/messengerLoader';
import { TreeDept } from '../../models/TreeDept';
import { Nodes } from '../../models/Nodes'
import { TreeMember } from '../../models/TreeMember'
import { v4 } from 'uuid';
import { publishApi, subscribe, client } from '@/renderer/libs/stomp';
import { setNewNodeList } from '@/renderer/libs/stompData';
import MemberComponent from './MemberComponent';
import { Node } from '../../models/Node';
import store from '../../../store';
import BookmarkList from './BookmarkList';

const Store = require('electron-store')
const electronStore = new Store()

interface Props{
    clickDept?: any, // 체크박스 클릭 함수
    clickMember?: any,
    master?: TreeMember,
    oldMembers?: TreeMember[],
    isAllChecked?: boolean,
    dept: Node,
    tempMembers?: TreeMember[],
}

interface State{
    isExpanded : boolean, 
    isChecked: boolean,
    uuid: string,
    childNodes: Nodes[],
    memberIsChecked:boolean,
    nodeList: Node[],
    tempMembers: TreeMember[],
    newNodeList: Node[],
}

class Dept extends React.Component<Props, State>{
    constructor(props: Props){
        super(props);
        this.state = ({
            isExpanded: false,
            isChecked: false,
            uuid: v4(),
            childNodes : [],
            memberIsChecked: false,
            nodeList: [],
            tempMembers : store.getState().tempMembers,
            newNodeList:[],
        })
        this.expandTree = this.expandTree.bind(this);
        this.isCheckedForCss = this.isCheckedForCss.bind(this);
        store.subscribe(function(this: Dept){
            this.setState({
                tempMembers : store.getState().tempMembers,
                newNodeList: store.getState().newNodeList,
                childNodes: store.getState().childNodes
            },()=>{
                console.log("체크박스를 눌렀나요" + this.state.isChecked)
                if(this.state.isChecked){
                    this.setState({
                        isChecked: false
                    }, ()=> this.afterClick())
                }
            })
        }.bind(this));   
    }

    componentDidMount(){
        // subscribe(client, electronStore.get("username"), this.state.uuid, (obj:any) => {
        //     let payload = obj.payload;
        //     if(payload){
        //         if(payload.Nodes){
        //             this.setState({
        //                 childNodes : payload.Nodes,
        //             })
        //             let newNodeList : Node[];
        //             newNodeList = [];
        //             this.state.childNodes.map(node =>{
        //                 newNodeList =  newNodeList.concat([{"name": node.columnText , "id" : node.value, "hasChildren" : node.hasChildren, "isExpanded": false, "status": "select", "type": node.type, parentCode : node.parentCode}])   
        //             })
        //             this.setState({
        //                 nodeList:newNodeList
        //             }, 
        //             ()=>{
        //                 if(this.state.isChecked){
        //                     this.setState({
        //                         isChecked: !this.state.isChecked
        //                     }, ()=> this.afterClick())
        //                 }
        //             })
        //         }
        //     }
        // })
    
    }


    expandTree = (id) => {
        this.setState({
            isExpanded : !this.state.isExpanded
        })
        subscribe(client, electronStore.get("username"), this.state.uuid);
        publishApi(client, 'api.organ.tree', electronStore.get("username"), this.state.uuid, {"root": "N", "path": id})
    }
    
    clickTree = (id) => {
        subscribe(client, electronStore.get("username"), this.state.uuid);
        this.setState({
            isChecked: true
        }, () => publishApi(client, 'api.organ.tree', electronStore.get("username"), this.state.uuid, {"root": "N", "path": id}))
    }

    afterClick = () =>{
        console.log("afterClick이 실행되었음")
        console.log("왜 undefined가 뜨는지 모르겟네?")
        let temp : Node[];
        temp = [];
        this.state.nodeList.map(node=>{
            if(node.parentCode === this.props.dept.id){
                temp.push({"id": node.id, "name": node.name})
            }
        })
        console.log(temp)
        store.dispatch({type: 'clickDept', childNodes : temp})
        if(this.state.newNodeList && this.state.newNodeList.length > 0){
            this.state.newNodeList.map(node=>{
                let that = this;
                if(node.type === "dept" && node.hasChildren){
                    this.setState({
                        isChecked : false
                    }, ()=> that.clickTree(node.id))
                }
            })
        }   
    }
    isCheckedForCss = () : boolean =>{
        let ch : boolean
        if(this.state.nodeList && this.state.tempMembers && this.state.nodeList.length > 0 && this.state.tempMembers.length > 0 && this.props.oldMembers){
            ch = true;
            for(var i = 0; i < this.state.nodeList.length; i++){
                if(this.state.nodeList[i].type === "user"){
                    let idx = this.state.tempMembers.findIndex( obj => obj.userId === this.state.nodeList[i].id)
                    let idx2 = this.props.oldMembers.findIndex( obj => obj.userId === this.state.nodeList[i].id)
                    if(idx == -1 && idx2 == -1){
                        ch  = false;
                        break;
                    }
                }   
            }
        }else{
            ch = false;
        }
        return ch;
    }
    
    render(){
        let nodesComponent;
        // let newNodeList = setNewNodeList()
        
        if(this.state.newNodeList && this.state.newNodeList.length > 0){
            nodesComponent = this.state.newNodeList.map(node=>{
                if(node.parentCode == this.props.dept.id && node.type == "dept"){
                    return(
                        <Dept clickDept = {this.props.clickDept} clickMember = {this.props.clickMember}  master = {this.props.master} oldMembers = {this.props.oldMembers} dept = {node} tempMembers = {this.props.tempMembers}/>
                    )
                }
                if(node.parentCode == this.props.dept.id && node.type == "user"){
                    return(
                        <MemberComponent clickMember = {this.props.clickMember} master = {this.props.master} member = {node} oldMembers = {this.props.oldMembers}/>
                    )   
                }
            })
        }
        
        const checkboxId = "dept-"+ this.props.dept.id+"object:"+ Math.random()
        var triangleVisibility;
        if(!this.props.dept.hasChildren){
            triangleVisibility = { visibility : "hidden" }
        }
        return(
            <li ng-repeat={this.props.dept.hasChildren ? "node in docInfo.organ" : "node in node.subTree" } ng-class="{selected: isInviteMembers(node) >= 0}" ui-tree-node="" data-collapsed="true" ng-include="'organ_renderer'" className={this.props.dept.hasChildren ? "ng-scope angular-ui-tree-node" : "ng-scope angular-ui-tree-node selected"} expand-on-hover="false">
                <div className="organ_wrapper ng-scope">
                    <span ng-style="node.type === 'dept' &amp;&amp; !node.hasChildren &amp;&amp; {'visibility': 'hidden'}" style = {triangleVisibility}>
                        <input type="checkbox" id={checkboxId} ng-disabled="node.disabled" ng-checked="isInviteMembers(node) >= 0" ng-click="toggleMember(node, $event)" checked = {this.isCheckedForCss()}/>
                        <label htmlFor={checkboxId} data-nodrag="">
                            <i className="icon_checkbox" ng-class="{disabled: node.disabled}" onClick={(e) => this.clickTree(this.props.dept.id)}></i>
                        </label>
                    </span>
                    <span className="wrapmsgr_treeicon ng-scope" data-nodrag="" ng-click="toggleOrgan(this)" ng-if="node.type === 'dept'" ng-style="!node.hasChildren &amp;&amp; {'visibility': 'hidden', 'cursor': 'auto'}" onClick = {(e) => this.expandTree(this.props.dept.id)} style = {triangleVisibility}>
                        <i className="icon_triangle wrapmsgr_collapse" ng-class="{true: 'wrapmsgr_collapse', false: 'wrapmsgr_expand'}[collapsed]"></i>
                    </span>
                    <div wrapmsgr-user-profile="users[node.value] || node.value" user-profile-disabled="node.type === 'dept'" className="ng-isolate-scope">
                        <span className="user-photo ng-binding ng-isolate-scope group no-photo green">{getShortName(this.props.dept.name)}</span>
                        <span className="wrapmsgr_member ng-binding">{this.props.dept.name}</span>
                    </div>
                    <ol ui-tree-nodes="" ng-model="node.subTree" ng-class="{expanded: !collapsed}"  className={this.state.isExpanded ? "ng-pristine ng-untouched ng-valid ng-scope angular-ui-tree-nodes ng-not-empty expanded": "ng-pristine ng-untouched ng-valid ng-scope angular-ui-tree-nodes ng-not-empty"} >
                        { nodesComponent }
                    </ol>
                </div>
            </li>
        )
    }
}

export default Dept;


