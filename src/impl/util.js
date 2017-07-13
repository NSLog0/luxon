import { Duration } from '../duration';
import { DateTime } from '../datetime';
import { Zone } from '../zone';
import { LocalZone } from '../zones/localZone';
import { IANAZone } from '../zones/IANAZone';
import { FixedOffsetZone } from '../zones/fixedOffsetZone';
import { Settings } from '../settings';

/**
 * @private
 */

export class Util {
  static friendlyDuration(duration) {
    if (Util.isNumber(duration)) {
      return Duration.fromMilliseconds(duration);
    } else if (duration instanceof Duration) {
      return duration;
    } else if (duration instanceof Object) {
      return Duration.fromObject(duration);
    } else {
      throw new Error('Unknown duration argument');
    }
  }

  static friendlyDateTime(dateTimeish) {
    if (dateTimeish instanceof DateTime) {
      return dateTimeish;
    } else if (dateTimeish.valueOf && Util.isNumber(dateTimeish.valueOf())) {
      return DateTime.fromJSDate(dateTimeish);
    } else if (dateTimeish instanceof Object) {
      return DateTime.fromObject(dateTimeish);
    } else {
      throw new Error('Unknown datetime argument');
    }
  }

  static isUndefined(o) {
    return typeof o === 'undefined';
  }

  static isNumber(o) {
    return typeof o === 'number';
  }

  static isString(o) {
    return typeof o === 'string';
  }

  static numberBetween(thing, bottom, top) {
    return Util.isNumber(thing) && thing >= bottom && thing <= top;
  }

  static pad(input, n = 2) {
    return ('0'.repeat(n) + input).slice(-n);
  }

  static towardZero(input) {
    return input < 0 ? Math.ceil(input) : Math.floor(input);
  }

  // DateTime -> JS date such that the date's UTC time is the datetimes's local time
  static asIfUTC(dt) {
    const ts = dt.ts - dt.offset;
    return new Date(ts);
  }

  // http://stackoverflow.com/a/15030117
  static flatten(arr) {
    return arr.reduce(
      (flat, toFlatten) =>
        flat.concat(Array.isArray(toFlatten) ? Util.flatten(toFlatten) : toFlatten),
      []
    );
  }

  static bestBy(arr, by, compare) {
    return arr.reduce((best, next) => {
      const pair = [by(next), next];
      if (!best) {
        return pair;
      } else if (compare.apply(null, [best[0], pair[0]]) === best[0]) {
        return best;
      } else {
        return pair;
      }
    }, null)[1];
  }

  static pick(obj, keys) {
    return keys.reduce((a, k) => {
      a[k] = obj[k];
      return a;
    }, {});
  }

  static isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  static daysInYear(year) {
    return Util.isLeapYear(year) ? 366 : 365;
  }

  static daysInMonth(year, month) {
    if (month === 2) {
      return Util.isLeapYear(year) ? 29 : 28;
    } else {
      return [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    }
  }

  // Huge hack. The point of this is to extract the named offset info
  // WITHOUT using the polyfill OR formatToParts, since the poly doesn't support
  // zones and real JS doesn't support formatToParts.
  // Only works if offset name is at the end of the string, so probably spews
  // junk for Arabic. Also note that this won't internationalize in Node
  // unless you have an Intl build.
  static parseZoneInfo(ts, offsetFormat, locale, timeZone = null) {
    const date = new Date(ts),
      intl = {
        hour12: false,
        // avoid AM/PM
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      };

    if (timeZone) {
      intl.timeZone = timeZone;
    }

    const without = new Intl.DateTimeFormat(locale, intl).format(date),
      modified = Object.assign({ timeZoneName: offsetFormat }, intl),
      included = new Intl.DateTimeFormat(locale, modified).format(date),
      diffed = included.substring(without.length),
      trimmed = diffed.replace(/^[, ]+/, '');

    return trimmed;
  }

  static normalizeZone(input) {
    if (input instanceof Zone) {
      return input;
    } else if (Util.isString(input)) {
      const lowered = input.toLowerCase();
      if (lowered === 'local') return LocalZone.instance;
      else if (lowered === 'utc') return FixedOffsetZone.utcInstance;
      else if (IANAZone.isValidSpecier(lowered)) return new IANAZone(input);
      else return FixedOffsetZone.parseSpecifier(lowered) || Settings.defaultZone;
    } else if (Util.isNumber(input)) {
      return FixedOffsetZone.instance(input);
    } else if (typeof input === 'object' && input.offset) {
      // This is dumb, but the instanceof check above doesn't seem to really work
      // so we're duck checking it
      return input;
    } else {
      return Settings.defaultZone;
    }
  }

  static normalizeObject(obj, normalizer) {
    const normalized = {};
    for (const u in obj) {
      if (obj.hasOwnProperty(u)) {
        const v = obj[u];
        if (v !== null && !Util.isUndefined(v) && !isNaN(v)) {
          normalized[normalizer(u)] = v;
        }
      }
    }
    return normalized;
  }

  static timeObject(obj) {
    return Util.pick(obj, ['hour', 'minute', 'second', 'millisecond']);
  }

  static untrucateYear(year) {
    return year > 60 ? 1900 + year : 2000 + year;
  }

  // signedOffset('-5', '30') -> -330
  static signedOffset(offHourStr, offMinuteStr) {
    const offHour = parseInt(offHourStr, 10) || 0,
      offMin = parseInt(offMinuteStr, 10) || 0,
      offMinSigned = offHour < 0 ? -offMin : offMin;
    return offHour * 60 + offMinSigned;
  }
}
