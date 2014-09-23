#!/usr/bin/env python
# -*- coding: utf8 -*-

# Copyright 2014 Lemur Consulting Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import optparse
import os
import requests
import sys

# The wikipedia export URL
WIKIPEDIA_URL = 'http://EN.wikipedia.org/w/index.php?title=Special:Export&action=submit&dir=desc'
# The wikipedia category download URL
CATEGORY_URL = 'http://en.wikipedia.org/w/api.php?action=query&list=categorymembers&format=json&cmlimit=500'
# Output directory into which data files should be written
OUT_DIR = 'data'

# Valid characters to use in the output filename
FILENAME_CHARS = '-_.() '

p = optparse.OptionParser()
p.add_option('-s', action='store_true', dest='skip')
p.set_defaults(skip=False)
(options, args) = p.parse_args()

if len(args) != 1:
    print 'Usage: python %s [-s] pagelist.txt' % sys.argv[0]


def fetch_category(category):
    """ Fetch the members of a category from Wikipedia and return them,
    excluding any nested category entries. 
    """
    members = []
    url = '{0}&cmtitle={1}'.format(CATEGORY_URL, category)
    done = False
    while not done:
        r = requests.get(url)
        if r.status_code != 200:
            print 'Unexpected status code fetching category'
            print 'Status %d - %s' % (r.status_code, r.text)
            sys.exit(1)
        # Category data is in JSON format
        json = r.json()
        for member in json['query']['categorymembers']:
            if not member['title'].startswith('Category:'):
                # Convert the title to Wikipedia URL format
                members.append(member['title'].replace(' ', '_'))
        if json.has_key('query-continue'):
            # More pages to fetch
            url = '{0}&cmtitle={1}&cmcontinue={2}'.format(CATEGORY_URL, 
                category, 
                json['query-continue']['categorymembers']['cmcontinue'])
        else:
            done = True
    print 'Found %d members for %s' % (len(members), category)
    return members
    
    
def get_filename(pagename):
    """ Convert the pagename into a valid filename, stripping out quotes, etc.
        Unsophisticated, but does make it easier to fetch Siân James' page.
    """
    return ''.join(c for c in pagename if c.isalnum() or c in FILENAME_CHARS).rstrip()
    

# Build the complete list of pages to fetch, expanding any category entries
fetch_list = []
with open(args[0]) as f:
    for line in f:
        line = line.strip()
        # Skip comments and blank lines
        if line.startswith('#') or len(line) == 0:
            continue

        if line.startswith('Category:'):
            print 'Fetching category members for %s' % line
            fetch_list.extend(fetch_category(line))
        else:
            fetch_list.append(line)

# Fetch each page, with revisions, and write to individual XML files
for page in fetch_list:
    print page,
    try:
        outpath = '{0}/{1}.xml'.format(OUT_DIR, get_filename(page))
        if options.skip and os.path.exists(outpath):
            print ' - already fetched, skipping'
        else:
            print ' - fetching'
            r = requests.post('{0}&pages={1}'.format(WIKIPEDIA_URL, page))
            if r.status_code != 200:
                print '*** Unexpected status code %d fetching %s' % (r.status_code, page)
            else:
                out = open(outpath, 'wb')
                out.write(r.text.encode(r.encoding))
                out.close()
    except UnicodeDecodeError as e:
        print '*** Unicode error : %s' % (e)
