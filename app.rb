


require 'sinatra'
require 'sinatra/json'
require 'date'

set :bind, '0.0.0.0'
set :public_folder, 'static'

get '/' do
  'Hello world!'
end

$data = []

# generate test data
def generate_data(size=500)
  if (size > 500000)
    size =500000
  end
  start = Time.now.getutc.to_i
  puts "start_date = #{start}, size=#{size}"
  val = start
  inc = 60 * 60 * 24 * 400 / size
  $data = []

  (1..size).each do |x|
    val += inc
    r = Math.sin(x* 7.0 /size) * 30.0 + 50
    r2 = Math.sin(x * 50.0 / size) * 10
    extra = x % 1000 == 0 ? 20 : 0
    if (x % 600 == 0)
      rand2 = rand(2)
    end
    $data << [val * 1000, (r + extra + r2 + rand(15)).round(2)]
  end
    #data << [val * 1000, 10+r, 10+r+s, 10+r+2*s, 10+r + 3*s, 10+r + 4*s]


end

generate_data()


def get_data(params)

  off = params['detail'].to_i
  puts "offset = #{off}"
  $data = [

      ['14-Jun-2009', 12, 16, 20, 24, 30],
      ['14-Jun-2009 20:00', 13, 16, 20, 24, 30],
      ['15-Jun-2009', 23, 26, 30, 34, 39],
      ['17-Jun-2009', 14, 16, 20, 24, 28],
      ['27-Jun-2009', 14, 16, 20, 24, 28]
  ]
  $data.each_with_index do |x, ix|
    if (ix == 1)
      (1..5).each do |i|
        x[i] += off;
      end
    end
  end
  #puts "data=#{data}"
  json $data

end

# Generate one boxcharts

def summarize(dlist, list, summary, delta)
  if list.length == 0
    return
  end
  min = 100000; max = 0; tot =0
  list.each do |y|
    tot += y
    min = y if (min > y)
    max = y if (max < y)
  end
  sorted = list.sort

  if (sorted.length == 2)
    low = high = avg = med = (tot/sorted.length).round(2)
  elsif (sorted.length == 3)
    low = high = sorted[1]
    avg = med = (tot/sorted.length).round(2)
  else
    low = sorted[sorted.length/4]
    med = sorted[sorted.length/2]
    high = sorted[sorted.length/4*3-1]
    avg = (tot/sorted.length).round(2)
  end

  #puts "low=#{low}, med=#{med}, hi=#{high}"
  #puts "POINT range=#{dlist[0]}-#{dlist[-1]}, min=#{min}"

  summary << {'stime' => dlist[0] , 'etime' => dlist[-1] +delta, 'size' => list.length,
              'min' => min, 'max' => max,
              'low' => low, 'med' => med, 'high' => high,  'avg' => avg }
end


# generate all points or boxcharts
def summarize_data(params)
  summary = []
  detail_level = params['detail'] # number of boxes to show


  date_range = params['date_range']
  puts "date_range= #{date_range}"

  start_date = end_date = 0
  if (date_range && date_range != '')
    dates = date_range.split(",")
    start_date = dates[0].to_i; end_date = dates[1].to_i
  end

  data_cnt = 0
  $data.each do |x|
    if (start_date > 0)
      break if (x[0] > end_date)
      if (x[0] < start_date || x[0] > end_date)
        next
      end
    end
    data_cnt += 1
  end

  if (detail_level == "ALL")
      box_count = data_cnt
  else
      box_count = detail_level.to_i
  end

  group_size = data_cnt / box_count

  if (group_size < 1)
    group_size = 1
  elsif (group_size < 4)
      group_size = 1
      box_count = data_cnt
  end

  puts "group_size=#{group_size}"
  puts "s_date=#{start_date}"
  puts "e_date=#{end_date}"

  count= 0; total = 0
  list = []; dlist = []
  start_time = 0
  box_count = 0
  result_start = result_end = 0
  $data.each_with_index do |x, index|
    if (start_date > 0)
      break if (x[0] > end_date)
      if (x[0] < start_date || x[0] > end_date)
         next
      end
    end
    if (result_start == 0)
      result_start = x[0]
    end
    result_end = x[0]
    total += 1
    count += 1
    list << x[1]
    dlist << x[0]

    if (count == group_size)

       box_count += 1
       if (group_size == 1)
         v = list[0]
         summary << {'stime' => dlist[0] , 'etime' => dlist[0] , 'size' => 1,
                     'min' => v, 'max' => v, 'low' => v, 'med' => v, 'high' => v, 'avg' => v }
       else
         delta = 0;
         if (index+1 < $data.length)
           delta = ($data[index+1][0] - $data[index][0])   # time space between points
           #puts "delta = #{delta}"
         end
         summarize(dlist, list, summary, delta)

       end
       list = []; dlist = []
       count= 0; start_time =0

    end

  end
  if (list.length > 0)
      summarize(dlist, list, summary, 0)
      box_count += 1
  end

  delta = 1;
  if (summary.length > 1)
    delta = summary[1]['stime'] - summary[0]['stime']
  end
  puts "result_start = #{result_start}, end=#{result_end}, group_size=#{group_size}, box_count=#{box_count}"
  puts "delta = #{delta}"
  s1 = Time.at(result_start/1000)
  s2 = Time.at(result_end/1000)

  json ({'start' => s1.strftime("%b-%d-%Y"),
         'end'   => s2.strftime("%b-%d-%Y"),
         'start_time' => s1.strftime("%b-%d-%Y %H:%M"),
         'end_time' => s2.strftime("%b-%d-%Y %H:%M"),
         'group_size' => group_size, 'delta' => delta,
         'point_count' => total, 'box_count' => box_count,
         'data' => summary })
end

get '/data' do
  puts "P=#{params}"
  get_data(params)
end

get '/data2' do
  puts "P=#{params}"
  summarize_data(params)
end

# re-generate test data
get '/size' do
  size = params['size'].to_i
  generate_data(size)
end




