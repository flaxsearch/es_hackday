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

import json
import optparse
import os
import re
import requests
import sys
import xml.etree.ElementTree as ET

ES_URL = 'http://localhost:9200/wikipedia/revisions'
HEADERS = { 'ContentType': 'application/json' }

class FileHandler:
    
    def __init__(self, filepath):
        # Read the file, strip the namespace - makes life too complicated!
        with open(filepath) as f:
            text = f.read()
        text = re.sub(' xmlns="[^"]+"', '', text, count=1)
        self.root = ET.fromstring(text)
        self.page_title = self.root.findtext('./page/title')
        self.page_id = self.root.findtext('./page/id')
        
    def get_revision(self):
        """ Return a generator returning each revision in the file. """
        for revision in self.root.findall('./page/revision'):
            data = { 'page_id': self.page_id, 'page_title': self.page_title,
                    'timestamp': revision.findtext('timestamp'),
                    'comment': revision.findtext('comment'),
                    'revision_id': revision.findtext('id') }
            # Contributors have either username+id or ip address
            if revision.find('./contributor/username') is not None:
                data['contributor_username'] = revision.findtext('./contributor/username')
                data['contributor_id'] = revision.findtext('./contributor/id')
            if revision.find('./contributor/ip') is not None:
                data['contributor_ip'] = revision.findtext('./contributor/ip')
            yield data
                


def index_file(filepath):
    fh = FileHandler(filepath)
    i = 0
    for rev in fh.get_revision():
        url = '{0}/{1}'.format(ES_URL, rev['revision_id'])
        r = requests.put(url, data=json.dumps(rev), headers=HEADERS)
        if r.status_code >= 400:
            print '*** Unexpected status code from ES: %d - %s' % (r.status_code, r.text)
            sys.exit(1)
        i += 1
    return i    
        

p = optparse.OptionParser()
(options, args) = p.parse_args()

if len(args) != 1:
    print 'Usage: python %s data_dir' % sys.argv[0]

total = 0
for parent, subdirs, filenames in os.walk(args[0]):
    for filename in filenames:
        if filename.lower().endswith(".xml"):
            fullpath = os.path.join(parent, filename)
            count = index_file(fullpath)
            print 'Indexed %d revisions from %s' % (count, fullpath)
            total += count
print 'Finished! %d revisions indexed' % total

