/**
 * 避免lodash打包体积过大
 * 像assign, keys尽量使用Object的函数
 */
import unset from 'lodash/unset';
import uniqBy from 'lodash/uniqBy';
import pull from 'lodash/pull';
import uniq from 'lodash/uniq';
import get from 'lodash/get';
import set from 'lodash/set';
import intersection from 'lodash/intersection';
import omit from 'lodash/omit';
import merge from 'lodash/merge';
import cloneDeep from 'lodash/cloneDeep';
import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';
import union from 'lodash/union';
import difference from 'lodash/difference';
import groupBy from 'lodash/groupBy';
import unionBy from 'lodash/unionBy';
export { unset, pull, uniq, uniqBy, get, set, intersection, omit, merge, cloneDeep, pick, isEqual, union, difference, groupBy, unionBy, };
