/*
  Use case: list the addresses that currently follow a followee.

  Returns { followeeAddr, followers: string[] }.
*/

import { FollowListUseCase } from './lib/follow-list-use-case.js'

class ListFollowers extends FollowListUseCase {
  constructor (localConfig = {}) {
    super(localConfig, {
      useCaseName: 'ListFollowers',
      adapterMethod: 'listFollowers',
      addrField: 'followeeAddr',
      resultField: 'followers'
    })
  }
}

export default ListFollowers

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-08-27T18:12:50.678Z","module_hash":"df81cf75d36c396a429313ca0b95620e66c923146a4f3a987239704d233a2609","functions":[{"id":"func/ListFollowers.constructor","name":"ListFollowers.constructor","line":10,"end_line":17,"hash":"63a34c60f43c67273227749b2cf5b8353d3309b9eaf7287ca95ddffb8613bcf6"}]}
// mutate4javascript-manifest-end
