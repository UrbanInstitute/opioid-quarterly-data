#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prepData.py

Script to reshape source data into structure needed for d3

Created on Tue Nov 27 11:39:19 2018

@author: afeng
"""

import pandas as pd
import numpy as np

# todo: turn this into command line arguments
total_qtr_filename = 'source/Quarterly_bydrug_2018Q2.csv'
generic_brand_qtr_filename = 'source/Quarterly_bydrug_bygeneric_2018Q2.csv'
total_yr_filename = 'source/Annual_bydrug_2018Q2.csv'
generic_brand_yr_filename = 'source/Annual_bydrug_bygeneric_2018Q2.csv'

# read in data
total_qtr = pd.read_csv(total_qtr_filename)
generic_brand_qtr = pd.read_csv(generic_brand_qtr_filename)
total_yr = pd.read_csv(total_yr_filename)
generic_brand_yr = pd.read_csv(generic_brand_yr_filename)

# convert quarters into dates
# Q1 => Jan, Q2 => Apr, Q3 => July, Q4 => Oct
def qtrToDate(df):
    month = (df.quarter * 3) - 2
    return pd.to_datetime(str(df.year) + "-" + str(month) + "-01", format="%Y-%m-%d")

total_qtr.replace({'drugtype': 'bup'}, 'buprenorphine', inplace = True)
total_qtr = total_qtr[total_qtr.drugtype != 'all']
total_qtr['temporal_unit'] = 'quarterly'
total_qtr['date'] = total_qtr.apply(qtrToDate, axis = 1)
total_qtr.drop(['genericind', 'year', 'quarter'], axis = 1, inplace = True)
total_qtr_long = pd.melt(total_qtr, id_vars=['state', 'drugtype', 'temporal_unit', 'date'],
        value_vars = ['rx', 'adjmedamt', 'percap_rx', 'percap_adjmedamt'],
        var_name = 'metric')
total_qtr_long['type'] = np.where(total_qtr_long['metric'].str.contains('percap'), 'percap', 'total')
total_qtr_long['metric'] = np.where(total_qtr_long['metric'].str.contains('percap'), 
              total_qtr_long['metric'].str.split('_').str.get(1), total_qtr_long['metric'])
total_qtr_long['drug_type'] = total_qtr_long['drugtype'] + "_" + total_qtr_long['type']
total_qtr_final = total_qtr_long.pivot_table(index=['state', 'temporal_unit', 'date', 'metric'], columns = 'drug_type', values = 'value')

generic_brand_qtr.replace({'drugtype': 'bup'}, 'buprenorphine', inplace = True)
generic_brand_qtr = generic_brand_qtr[generic_brand_qtr.drugtype != 'all']
generic_brand_qtr['temporal_unit'] = 'quarterly'
generic_brand_qtr['date'] = generic_brand_qtr.apply(qtrToDate, axis = 1)
generic_brand_qtr.drop(['year', 'quarter'], axis = 1, inplace = True)
generic_brand_qtr_long = pd.melt(generic_brand_qtr, id_vars=['state', 'drugtype', 'temporal_unit', 'date', 'genericind'],
                                 value_vars = ['rx', 'adjmedamt'], var_name = 'metric')
generic_brand_qtr_long['drug_genericind'] = generic_brand_qtr_long['drugtype'] + "_" + generic_brand_qtr_long['genericind']
generic_brand_qtr_final = generic_brand_qtr_long.pivot_table(index=['state', 'temporal_unit', 'date', 'metric'], columns = 'drug_genericind', values = 'value')

quarterly_final = total_qtr_final.join(generic_brand_qtr_final).reset_index()

total_yr.replace({'drugtype': 'bup'}, 'buprenorphine', inplace = True)
total_yr = total_yr[total_yr.drugtype != 'all']
total_yr['temporal_unit'] = 'annual'
total_yr['date'] = pd.to_datetime(total_yr['year'].astype(str), format="%Y")
total_yr.drop(['genericind', 'year', 'quarter'], axis = 1, inplace = True)
total_yr_long = pd.melt(total_yr, id_vars=['state', 'drugtype', 'temporal_unit', 'date'],
                        value_vars = ['rx', 'adjmedamt', 'percap_rx', 'percap_adjmedamt'],
                        var_name = 'metric')
total_yr_long['type'] = np.where(total_yr_long['metric'].str.contains('percap'), 'percap', 'total')
total_yr_long['metric'] = np.where(total_yr_long['metric'].str.contains('percap'),
             total_yr_long['metric'].str.split('_').str.get(1), total_yr_long['metric'])
total_yr_long['drug_type'] = total_yr_long['drugtype'] + "_" + total_yr_long['type']
total_yr_final = total_yr_long.pivot_table(index=['state', 'temporal_unit', 'date', 'metric'], columns = 'drug_type', values = 'value')

generic_brand_yr.replace({'drugtype': 'bup'}, 'buprenorphine', inplace = True)
generic_brand_yr = generic_brand_yr[generic_brand_yr.drugtype != 'all']
generic_brand_yr['temporal_unit'] = 'annual'
generic_brand_yr['date'] = pd.to_datetime(generic_brand_yr['year'].astype(str), format="%Y")
generic_brand_yr.drop(['year', 'quarter'], axis = 1, inplace = True)
generic_brand_yr_long = pd.melt(generic_brand_yr, id_vars=['state', 'drugtype', 'temporal_unit', 'date', 'genericind'],
                                value_vars = ['rx', 'adjmedamt'], var_name = 'metric')
generic_brand_yr_long['drug_genericind'] = generic_brand_yr_long['drugtype'] + "_" + generic_brand_yr_long['genericind']
generic_brand_yr_final = generic_brand_yr_long.pivot_table(index=['state', 'temporal_unit', 'date', 'metric'], columns = 'drug_genericind', values = 'value')

yr_final = total_yr_final.join(generic_brand_yr_final).reset_index()

final = pd.concat([quarterly_final, yr_final])
#final.rename(columns={'drugtype': 'drug'}, inplace = True)
final.replace({'state': 'XX'}, 'National', inplace = True)
# probably also want to adjust metric names but wait on final labels before doing this

final.to_csv('opioids_data.csv', index = False)
