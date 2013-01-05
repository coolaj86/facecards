/*jshint strict:true browser:true debug:true jquery:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true unused:true undef:true*/
var cache
  , Join = null
  , store = {}
  , gmembers
  , gcards
  , ldsDir
  , emitter = {}
    // TODO don't... just don't
  , ludrsBase = 'https://www.lds.org/directory/services/ludrs'
  ;

(function () {
  "use strict";
  
  // Poor Man's DB
  store.get = function (key) {
    if (!cache) {
      cache = {};//JSON.parse(localStorage.getItem('cache') || "{}");
    }

    return cache[key];
  };
  store.set = function (key, val) {
    cache[key] = val;
    //return localStorage.setItem('cache', JSON.stringify(cache));
  };

  // Poor Man's Event Emitter
  function Emitter() {
    this.init();
  }
  Emitter.prototype.init = function () {
    emitter._listeners = {};
  };
  Emitter.prototype.on = function (event, fn) {
    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].push(fn);
  };
  Emitter.prototype.emit = function () {
    var args = [].slice.call(arguments)
      , event = args.shift()
      ;

    this._listeners[event] = this._listeners[event] || [];
    this._listeners[event].forEach(function (fn) {
      fn.apply(null, args);
    });
  };

  // Poor Man's Join
  Join = {
    create: function () {
      var things = []
        , len = Infinity
        , fn
        , complete = 0
        ;

      return {
          when: function (_fn) {
            fn = _fn;
            len = things.length;
            if (complete === len) {
              fn.apply(null, things);
            }
          }
        , add: function () {
            var i = things.length
              ;
              
            things[things.length] = null;

            return function () {
              var args = [].slice.call(arguments)
                ;

              complete += 1;
              things[i] = args;
              if (fn && (complete === len)) {
                fn.apply(null, things);
              }
            };
          }
      };
    }
  };

  // Poor Man's forEachAsync
  function forEachAsync(arr, fn) {
    var gfn
      , index = -1
      ;

    function next() {
      if (0 === arr.length) {
        gfn();
        return;
      }

      index += 1;
      fn(next, arr.shift(), index, arr);
    }

    setTimeout(next, 4);

    return {
      then: function (_fn) {
        gfn = _fn;
      }
    };
  }

  var ldsDirP
    ;
  function LdsDir() {
  }
  ldsDirP = LdsDir.prototype;
  ldsDirP.init = function (fns) {
    this.areas = null;
    this.homeArea = null;
    this.homeAreaId = null;

    this.stakes = null;
    this.homeStake = null;
    this.homeStakeId = null;

    this.wards = null;
    this.homeWard = null;
    this.homeWardId = null;

    this._listeners = fns || {};
  };
  ldsDirP.getHousehold = function (fn, id) {
    var me = this
      , profileId = 'profile-' + id
      , profile = store.get(profileId)
      ;

    function onResult() {
      store.set(profileId, profile);
      if (me._listeners.profile) {
        me._listeners.profile(profile);
      }
      fn(profile);
    }

    if (profile) {
      onResult(profile);
      return;
    }

    function getPic(next, card) {
      if (!card.photoUrl) {
        next();
        return;
      }

      var img
        ;

      img = document.createElement('img');
      img.onload = function () {
        var c = document.createElement('canvas')
          , c2d = c.getContext('2d')
          ;

        c.height = this.height,
        c.width = this.width;
        c2d.drawImage(this, 0,0);

        card.imageData = c.toDataURL('image/jpeg', 0.4);
        next();
      };

      img.onerror = function(){
        next();
      };

      img.src = card.photoUrl;
    }

    $.getJSON(ludrsBase + '/mem/householdProfile/' + id, function (_profile) {
      profile = _profile;
      profile.photoUrl = profile.householdInfo.photoUrl || profile.headOfHousehold.photoUrl;
      getPic(onResult, profile);
    });
  };

  ldsDirP.getHouseholds = function (fn, profileIds) {
    var me = this
      , membersInfo = []
      ;

    function gotOneHousehold(next, memberId) {
      me.getHousehold(function (household) {
        membersInfo.push(household);
        next();
      }, memberId);
    }

    forEachAsync(profileIds, gotOneHousehold).then(function () {
      console.log(membersInfo);
      fn(membersInfo);
    });
  };

  ldsDirP.getWard = function (fn, wardUnitNo) {
    var join = Join.create()
      , memberListId = 'member-list-' + wardUnitNo
      , memberList = store.get(memberListId)
      ;

    if (memberList) {
      fn(memberList);
      return;
    }
    
    $.getJSON(ludrsBase + '/mem/member-list/' + wardUnitNo, join.add());
    // https://www.lds.org/directory/services/ludrs/mem/wardDirectory/photos/228079
    $.getJSON(ludrsBase + '/mem/wardDirectory/photos/' + wardUnitNo, join.add());

    join.when(function (memberListArgs, photoListArgs) {
      var memberList = memberListArgs[0]
        , photoList = photoListArgs[0]
        ;

      photoList.forEach(function (photo) {
        memberList.forEach(function (member) {
          if (photo.householdId !== member.headOfHouseIndividualId) {
            return;
          }

          member.householdId = photo.householdId;
          member.householdName = photo.householdName;
          member.phoneNumber = photo.phoneNumber;
          member.photoUrl = member.photoUrl || photo.photoUrl;
        });
      });

      store.set('member-list-' + wardUnitNo, memberList);
      // don't store photo list
      fn(memberList);
    });
  };
  ldsDirP.getWards = function (fn, wardUnitNos) {
    var me = this
      , profileIds = []
      ;

    function pushMemberIds(next, wardUnitNo) {
      me.getWard(function (members) {
        members.forEach(function (m) {
          profileIds.push(m.headOfHouseIndividualId);
        });
        next();
      }, wardUnitNo);
    }

    forEachAsync(wardUnitNos, pushMemberIds).then(function () {
      me.getHouseholds(fn, profileIds);
    });
  };

  ldsDirP.getStakeInfo = function (fn) {
    var me = this
      , areaInfoId = 'area-info'
      , areaInfo = store.get(areaInfoId)
      , stakesInfoId = 'stakes-info'
      , stakesInfo = store.get(stakesInfoId)
      ;

    function onResult() {
      me.homeArea = areaInfo;
      me.homeAreaId = areaInfo.areaUnitNo;
      me.homeStakeId = areaInfo.stakeUnitNo;
      me.homeWardId = areaInfo.wardUnitNo;

      me.stakes = stakesInfo;
      me.homeStake = me.stakes[0];
      me.wards = me.homeStake.wards;
      fn();
    }

    if (areaInfo && stakesInfo) {
      onResult();
      return;
    }

    $.getJSON(ludrsBase + '/unit/current-user-ward-stake/', function (_areaInfo) {

      areaInfo = _areaInfo;
      store.set(areaInfoId, _areaInfo);

      $.getJSON(ludrsBase + '/unit/current-user-units/', function (_stakesInfo) {

        stakesInfo = _stakesInfo;
        store.set(stakesInfoId, stakesInfo);
        onResult();
      });
    });
  };

  function updateCounter() {
    $('#js-counter').text(1 + (Number($('#js-counter').text()) || 0));
  }
  //ldsDir = Object.create(LdsDir);
  ldsDir = new LdsDir();
/*
  // TODO events
  ldsDir.init({
      'stake': function (stake) {
        console.log('stake has ' + stake.wards.length + ' wards');
      }
    , 'ward': function (ward) {
        console.log('stake z, downolading ward x of y, ' + ward..length + ' households');
      }
    , 'profile': function (profile) {
        console.log('stake z, ward x, household y of q, ' + ward.length + ' households');
        // TODO ward + household + photo
      }
  });
*/
  ldsDir.init({
    profile: updateCounter
  });

  function onStakeInfo() {
    var cards = []
      , wards = ldsDir.wards
      , wardUnitNos = []
      ;

    if (!$('#js-counter').length) {
      $('body').prepend(
        '<div style="'
          + 'z-index: 100000; position:fixed;'
          + 'top:40%; width:200px; height:50px;'
          + 'right: 50%; background-color:black;'
        + '" id="js-counter">0</div>'
      );
    }

    // TODO use underscore.pluck
    wards.forEach(function (w) {
      wardUnitNos.push(w.wardUnitNo);
    });

    ldsDir.getWards(function (households) {
      console.log('getWards');
      var emails = []
        , deckId
        ;

      console.log('got wards 9');
      households.forEach(function (m) {
        var email = m.householdInfo.email || m.headOfHousehold.email
          ;

        if (email) {
          emails.push(email);
        }
      });

      gmembers = households;

      console.log('got wards a');
      households.forEach(function (h) {
        cards.push({
            "name": h.headOfHousehold.name
          //TODO, "gender": 
          , "imageData": h.imageData // added by download
        });
      });

      gcards = cards;

      console.log('got wards a.2');
      deckId = prompt('Name this deck (should end with .json)');
      if (!/\.json$/.test(deckId)) {
        deckId += '.json';
        alert('deckId changed to ' + deckId);
      }

      console.log('got wards b');
      $.ajax({
          type: 'POST'
        , url: 'http://LOCATION_HOST/decks/' + deckId
        , contentType: 'application/json; charset=utf-8'
        , data: JSON.stringify(cards)
        , processData: false
        , success: function (data) {
            if (!data || !data.success) {
              alert('had error posting deck');
              return;
            }
            location.href = 'http://LOCATION_HOST#' + deckId;
          }
      });
    }, [ldsDir.homeWardId] || ldsDir.homeStake.wards);
  }
  ldsDir.getStakeInfo(onStakeInfo);
}());
