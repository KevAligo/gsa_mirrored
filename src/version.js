/* Copyright (C) 2021 Greenbone Networks GmbH
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License
 * as published by the Free Software Foundation, either version 3
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

<<<<<<< HEAD
<<<<<<< HEAD
const VERSION = '21.4.3';
=======
// must be only major.minor
export const VERSION = '22.04';
>>>>>>> 33187667d (Rework version module to use same veriable as on (old)stable)
=======
const getMajorMinorVersion = () => {
  // eslint-disable-next-line no-unused-vars
  const [major, minor, ...rest] = VERSION.split('.');
  return `${major}.${minor}`;
};

export const VERSION = '22.04.1';

export const RELEASE_VERSION = getMajorMinorVersion();
>>>>>>> 7e32ef6bd (Introduce a special release version variable)

export default VERSION;
